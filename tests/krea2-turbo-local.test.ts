import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getModel } from "@/lib/catalog";
import { controlSets } from "@/lib/catalog/plan";
import { type ComfyWorkflow, type Manifest } from "@/lib/comfy";

// The three quantized Krea 2 Turbo builds the owner keeps on their own ComfyUI. This is the entry that loads them
// through the krea2-model-router (docs/runbooks/krea2-turbo-loaders.md): the GGUF Q4_K_M is the file the graph is
// pinned to and the control loads by default, the ConvRot int8 and the ConvRot int4 are optional picks. The sizes
// below are the live server's own numbers - `GET /experiment/models/diffusion_models` on comfyui_gpu2 reports
// 13,492,686,496 and 6,427,972,219 for the two safetensors, and the pinned sizes match them byte for byte. A GGUF
// never appears in a folder listing (ComfyUI's supported extensions do not carry .gguf), which is why a .gguf is
// checked through a loader's combo list - and why the graph names it.
const root = path.resolve(__dirname, "..");
const readText = (name: string) => fs.readFileSync(path.join(root, "workflows/comfyui", name), "utf8");
const read = <T>(name: string): T => JSON.parse(readText(name)) as T;
type Subset = Record<string, { input: { required: Record<string, [string[]]> } }>;
const INT8 = "diffusion_models/krea2_turbo_int8_convrot.safetensors";
const INT4 = "diffusion_models/krea2_turbo_convrot_int4_fast.safetensors";
const GGUF = "diffusion_models/krea2_turbo-Q4_K_M.gguf";
const ENDPOINT = "krea2-turbo-local-t2i";
const sha256Of = (bytes: string) => createHash("sha256").update(bytes).digest("hex");

describe("krea2-turbo-local-t2i: the entry runs files that exist, and the gate checks what each pick loads", () => {
  it("the graph the library ships is the graph that was validated against a real server", async () => {
    const manifest = read<Manifest>("manifest.json");
    const entry = manifest.workflows.find((w) => w.id === ENDPOINT);
    expect(entry, ENDPOINT).toBeDefined();
    expect(entry!.validated).toBe(true);
    expect(entry!.validationError ?? null).toBeNull();

    // The record's sha must be the sha of the bytes the server actually accepted, and the graph must name a file
    // the live loader lists - otherwise "validated" backs nothing.
    const shipped = readText(`${ENDPOINT}.json`);
    const statePath = path.join(root, "scripts/comfy/validation-state.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as Record<string, { sha256: string; validated: boolean; error: string | null }>;
    expect(state[ENDPOINT].sha256).toBe(sha256Of(shipped));
    expect(state[ENDPOINT].validated).toBe(true);
    expect(state[ENDPOINT].error).toBeNull();

    const graph = JSON.parse(shipped) as ComfyWorkflow;
    expect(graph["10"].class_type).toBe("UnifiedModelLoader");
    expect(graph["10"].inputs.model_name).toBe("krea2_turbo-Q4_K_M.gguf");
    // The pinned default is a value the router lists on the recorded server, and it is the file the control's
    // default pick loads - so a POST of these bytes with no override is a POST of the default run.
    const routerList = read<Subset>("object_info.subset.json")["UnifiedModelLoader"].input.required.model_name[0];
    expect(routerList).toContain("krea2_turbo_int8_convrot.safetensors");
    expect(routerList).toContain("krea2_turbo-Q4_K_M.gguf");
    expect(routerList).toContain("krea2_turbo_convrot_int4_fast.safetensors");
    expect(routerList).not.toContain("krea2_turbo_fp8_scaled.safetensors"); // the file this entry never loads
    // The router is the pack the workflow asks for, and the licence table knows it.
    const { nodePack } = await import("@/lib/licences");
    expect(nodePack("krea2-model-router")).toBeDefined();
  });

  it("the requirements ask for the pinned int8 file - never fp8_scaled, which nothing here loads", async () => {
    const { parseIndex } = await import("@/lib/gpu/requirements");
    const idx = parseIndex(read("requirements.json"));
    const wf = idx.workflows[ENDPOINT];
    expect(wf, ENDPOINT).toBeDefined();

    // A workflow must not require a file its loaders do not list and its graph never loads.
    expect(wf.files).toContain(GGUF);
    const asked = [...wf.files, ...(wf.optional ?? [])];
    expect(asked.some((k) => k.includes("krea2_turbo_fp8_scaled")), "fp8 must not be asked for").toBe(false);

    // Every file the model control can name rides in `optional` and is declared in the index, the way
    // moss-image-t2i, the Kandinsky 6 graphs and the flux3-klein graphs do.
    expect(wf.optional).toEqual(expect.arrayContaining([INT8, INT4]));
    for (const key of wf.optional ?? []) expect(idx.files[key], key).toBeDefined();

    const gguf = idx.files[GGUF];
    expect(gguf.presence).toBe("loader"); // a folder listing never shows a .gguf; the loaders' combo lists are the check
    expect(gguf.loaders).toEqual([["UnifiedModelLoader", "model_name"]]);
    expect(gguf.sizeBytes).toBe(7486289184);
    expect(gguf.sha256).toBe("bc12f539de7a7a6ddf9bac17ec6e5bfecd42c3517190f491131d8464a1034b40"); // not a safetensors: the pin rides with the fix
    const int8 = idx.files[INT8];
    expect(int8.presence).toBe("loader"); // another Krea 2 graph names it too, so its loader list is the check
    expect(int8.loaders).toEqual(expect.arrayContaining([["UNETLoader", "unet_name"]]));
    expect(int8.sizeBytes).toBe(13492686496);
    const int4 = idx.files[INT4];
    expect(int4.presence).toBe("list"); // a folder listing with its real size is enough to tell
    expect(int4.sizeBytes).toBe(6427972219);
    expect((idx.workflows[ENDPOINT] as unknown as { packs: Record<string, string[]> }).packs).toEqual({ "krea2-model-router": ["UnifiedModelLoader"] });
  });

  it("the model control and the compose path put the picked file into the router node", async () => {
    const model = getModel("oss-krea2-turbo-local");
    expect(model).toBeDefined();
    expect(model!.routes.map((r) => [r.op, r.endpoint])).toEqual([["t2i", ENDPOINT]]);
    const control = model!.options.controls!.find((c) => c.param === "model")!;
    expect(control.values).toEqual(["gguf", "int8", "int4"]);
    expect(control.default).toBe("gguf"); // the file the graph is pinned to, so the default run is the pinned run
    expect(control.sets).toEqual({
      int8: { unet: "krea2_turbo_int8_convrot.safetensors" },
      int4: { unet: "krea2_turbo_convrot_int4_fast.safetensors" },
      gguf: { unet: "krea2_turbo-Q4_K_M.gguf" },
    });
    for (const pick of ["int8", "int4", "gguf"]) {
      expect(controlSets(model!, { extra: { model: pick } }).extra?.unet).toBe(control.sets![pick].unet);
    }
    // No pick at all: the control's default is the file the graph is pinned to.
    expect(controlSets(model!, { extra: {} }).extra?.unet).toBe("krea2_turbo-Q4_K_M.gguf");

    const { prepareWorkflow } = await import("@/server/providers/comfyui");
    process.env.COMFYUI_URL = "http://127.0.0.1:9"; // composing needs no server
    // The whole catalog-to-graph chain: the pick settles through controlSets and lands in the router node.
    const compose = async (pick: string): Promise<ComfyWorkflow> => {
      const settled = controlSets(model!, { extra: { model: pick } });
      const { workflow } = await prepareWorkflow(ENDPOINT, { seed: 7, prompt: "a fox", extra: settled.extra }, {
        generationId: "g", op: "t2i", upload: async (_d, _t, name) => `up_${name}`, media: (() => 0) as never,
      });
      return workflow;
    };
    expect((await compose("int4"))["10"].inputs.model_name).toBe("krea2_turbo_convrot_int4_fast.safetensors");
    expect((await compose("gguf"))["10"].inputs.model_name).toBe("krea2_turbo-Q4_K_M.gguf");
    expect((await compose("int8"))["10"].inputs.model_name).toBe("krea2_turbo_int8_convrot.safetensors");
  });

  it("the gate lets the owner run every pick, and asks for exactly the file a pick needs when it is gone", async () => {
    const { parseIndex } = await import("@/lib/gpu/requirements");
    const { writeSnapshot, dropSnapshots } = await import("@/server/gpu/snapshots");
    const { gateGeneration } = await import("@/server/gpu/gate");
    const idx = parseIndex(read("requirements.json"));
    const INSTALL = { kind: "install", key: "install", via: "server" } as const;
    // The combos are the recorded live lists (object_info.subset.json is a real server's /object_info, trimmed);
    // the sizes are that server's /experiment/models numbers and the disk's own bytes.
    const subset = read<Subset>("object_info.subset.json");
    const at = Date.now();
    const write = (missing: string[]) => {
      // Fresh inventory each time: the combos are the recorded live lists minus the files a server lacks.
      const models: Record<string, { have: Record<string, number | null>; total: number }> = {};
      for (const folder of idx.folders) models[folder] = { have: {}, total: 0 };
      models["diffusion_models"].have["krea2_turbo_int8_convrot.safetensors"] = 13492686496;
      models["diffusion_models"].have["krea2_turbo_convrot_int4_fast.safetensors"] = 6427972219;
      // The GGUF is the one file the listing genuinely does not show; the index knows it is unobservable.
      models["text_encoders"].have["qwen3vl_4b_fp8_scaled.safetensors"] = idx.files["text_encoders/qwen3vl_4b_fp8_scaled.safetensors"].sizeBytes;
      models["vae"].have["qwen_image_vae.safetensors"] = idx.files["vae/qwen_image_vae.safetensors"].sizeBytes;
      const combos: Record<string, string[]> = {
        "UnifiedModelLoader.model_name": subset["UnifiedModelLoader"].input.required.model_name[0].filter((v) => !missing.includes(v)),
        "UNETLoader.unet_name": subset["UNETLoader"].input.required.unet_name[0].filter((v) => !missing.includes(v)),
      };
      for (const name of missing) for (const folder of Object.keys(models)) delete models[folder].have[name];
      writeSnapshot(INSTALL, {
        v: 1, via: "server", checkedAt: at, tookMs: 5, reachable: true,
        devices: [{ name: "NVIDIA CMP 170HX", type: "cuda", index: 0, vramTotal: 68063395840, vramFree: 49656602660 }],
        comfy: { version: "0.43.1", flags: {} },
        manager: { api: "none" }, nodes: { have: ["UnifiedModelLoader"], missing: [], total: 1, readAt: at, how: "object_info" },
        combos, packs: {}, models, loras: {}, fingerprint: "x", errors: [],
      } as never);
    };
    const gate = (extra: Record<string, unknown>) =>
      gateGeneration(INSTALL, {
        request: { feature: "image", modelId: "oss-krea2-turbo-local", prompt: "a fox", params: { extra } },
        route: { provider: "comfyui", endpoint: ENDPOINT }, op: "t2i", modelId: "oss-krea2-turbo-local", actor: "owner",
      });

    try {
      // The owner who has the three files runs all three picks with nothing to download.
      write([]);
      expect(await gate({})).toEqual({ ok: true });
      expect(await gate({ model: "int8" })).toEqual({ ok: true });
      expect(await gate({ model: "int4" })).toEqual({ ok: true });
      expect(await gate({ model: "gguf" })).toEqual({ ok: true });

      // Remove the pinned default's file: the graph itself loads it, so every pick needs it. The GGUF is checked
      // through the loaders' combo lists because no folder listing can show it.
      write(["krea2_turbo-Q4_K_M.gguf"]);
      expect(await gate({})).toMatchObject({ ok: true, warning: expect.stringMatching(/needs 1 more thing/) });
      expect(await gate({ model: "int8" })).toMatchObject({ ok: true, warning: expect.stringMatching(/needs 1 more thing/) });
      expect(await gate({ model: "int4" })).toMatchObject({ ok: true, warning: expect.stringMatching(/needs 1 more thing/) });
      // Remove one pick's own file: the default run and the other picks still run, and only that pick asks.
      write(["krea2_turbo_int8_convrot.safetensors"]);
      expect(await gate({})).toEqual({ ok: true }); // the default run loads the GGUF, which is there
      expect(await gate({ model: "int4" })).toEqual({ ok: true });
      expect(await gate({ model: "int8" })).toMatchObject({ ok: true, warning: expect.stringMatching(/needs 1 more thing/) });
      write(["krea2_turbo_convrot_int4_fast.safetensors"]);
      expect(await gate({})).toEqual({ ok: true });
      expect(await gate({ model: "int8" })).toEqual({ ok: true });
      expect(await gate({ model: "int4" })).toMatchObject({ ok: true, warning: expect.stringMatching(/needs 1 more thing/) });
    } finally {
      dropSnapshots("install");
    }
  });
});
