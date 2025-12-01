export const nvidiaModels = {
    // === Meta Llama Series ===
    // Llama 4
    llama_4_maverick_17b_128e_instruct: "meta/llama-4-maverick-17b-128e-instruct",
    llama_4_scout_17b_16e_instruct: "meta/llama-4-scout-17b-16e-instruct",

    // Llama 3.2
    llama_3_2_90b_vision_instruct: "meta/llama-3.2-90b-vision-instruct",
    llama_3_2_11b_vision_instruct: "meta/llama-3.2-11b-vision-instruct",
    llama_3_2_3b_instruct: "meta/llama-3.2-3b-instruct",
    llama_3_2_1b_instruct: "meta/llama-3.2-1b-instruct",

    // Llama 3.1
    llama_3_1_405b_instruct: "meta/llama-3.1-405b-instruct",
    llama_3_1_70b_instruct: "meta/llama-3.1-70b-instruct",
    llama_3_1_8b_instruct: "meta/llama-3.1-8b-instruct",

    // Llama 3.3
    llama_3_3_70b_instruct: "meta/llama-3.3-70b-instruct",

    // Legacy Llama 3
    llama3_70b_instruct: "meta/llama3-70b",
    llama3_8b_instruct: "meta/llama3-8b",

    // === NVIDIA Nemotron & Derivatives ===
    llama_3_3_nemotron_super_49b_v1_5: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    llama_3_3_nemotron_super_49b_v1: "nvidia/llama-3.3-nemotron-super-49b-v1",
    llama_3_1_nemotron_ultra_253b_v1: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    llama_3_1_nemotron_nano_vl_8b_v1: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
    llama_3_1_nemotron_nano_8b_v1: "nvidia/llama-3.1-nemotron-nano-8b-v1",
    llama_3_1_nemotron_nano_4b_v1_1: "nvidia/llama-3.1-nemotron-nano-4b-v1.1",
    nemotron_nano_12b_v2_vl: "nvidia/nemotron-nano-12b-v2-vl",
    nvidia_nemotron_nano_9b_v2: "nvidia/nvidia-nemotron-nano-9b-v2",
    nemotron_mini_4b_instruct: "nvidia/nemotron-mini-4b-instruct",
    nemotron_4_mini_hindi_4b_instruct: "nvidia/nemotron-4-mini-hindi-4b-instruct",

    // === DeepSeek ===
    deepseek_v3_1: "deepseek-ai/deepseek-v3.1",
    deepseek_v3_1_terminus: "deepseek-ai/deepseek-v3.1-terminus",
    deepseek_r1: "deepseek-ai/deepseek-r1",
    deepseek_r1_0528: "deepseek-ai/deepseek-r1-0528",

    // DeepSeek Distilled
    deepseek_r1_distill_llama_8b: "deepseek-ai/deepseek-r1-distill-llama-8b",
    deepseek_r1_distill_qwen_32b: "deepseek-ai/deepseek-r1-distill-qwen-32b",
    deepseek_r1_distill_qwen_14b: "deepseek-ai/deepseek-r1-distill-qwen-14b",
    deepseek_r1_distill_qwen_7b: "deepseek-ai/deepseek-r1-distill-qwen-7b",

    // === Qwen Series (Alibaba) ===
    qwen3_next_80b_a3b_instruct: "qwen/qwen3-next-80b-a3b-instruct",
    qwen3_coder_480b_a35b_instruct: "qwen/qwen3-coder-480b-a35b-instruct",
    qwen3_235b_a22b: "qwen/qwen3-235b-a22b",
    qwq_32b: "qwen/qwq-32b",

    // Qwen 2.5
    qwen2_5_coder_32b_instruct: "qwen/qwen2.5-coder-32b-instruct",
    qwen2_5_coder_7b_instruct: "qwen/qwen2.5-coder-7b-instruct",
    qwen2_5_7b_instruct: "qwen/qwen2.5-7b-instruct",
    qwen2_7b_instruct: "qwen/qwen2-7b-instruct",

    // === Google Gemma ===
    gemma_3_27b_it: "google/gemma-3-27b-it",
    gemma_3n_e4b_it: "google/gemma-3n-e4b-it",
    gemma_3n_e2b_it: "google/gemma-3n-e2b-it",
    gemma_3_1b_it: "google/gemma-3-1b-it",
    gemma_2_27b_it: "google/gemma-2-27b-it",
    gemma_2_9b_it: "google/gemma-2-9b-it",
    gemma_2_9b_cpt_sahabatai_instruct: "gotocompany/gemma-2-9b-cpt-sahabatai-instruct",
    gemma_2_2b_it: "google/gemma-2-2b-it",
    gemma_7b: "google/gemma-7b",

    // === Mistral / Mixtral ===
    mistral_nemotron: "mistralai/mistral-nemotron",
    mistral_medium_3_instruct: "mistralai/mistral-medium-3-instruct",
    mistral_small_3_1_24b_instruct_2503: "mistralai/mistral-small-3.1-24b-instruct-2503",
    mistral_small_24b_instruct: "mistralai/mistral-small-24b-instruct",
    magistral_small_2506: "mistralai/magistral-small-2506",
    mixtral_8x22b_instruct_v0_1: "mistralai/mixtral-8x22b-instruct-v0.1",
    mixtral_8x7b_instruct_v0_1: "mistralai/mixtral-8x7b-instruct-v0.1",
    mistral_7b_instruct_v0_3: "mistralai/mistral-7b-instruct-v0.3",
    mistral_7b_instruct_v0_2: "mistralai/mistral-7b-instruct-v0.2",
    mamba_codestral_7b_v0_1: "mistralai/mamba-codestral-7b-v0.1",

    // === Microsoft Phi ===
    phi_4_multimodal_instruct: "microsoft/phi-4-multimodal-instruct",
    phi_4_mini_instruct: "microsoft/phi-4-mini-instruct",
    phi_4_mini_flash_reasoning: "microsoft/phi-4-mini-flash-reasoning",
    phi_3_5_mini_instruct: "microsoft/phi-3.5-mini-instruct",
    phi_3_medium_4k_instruct: "microsoft/phi-3-medium-4k-instruct",
    phi_3_small_128k_instruct: "microsoft/phi-3-small-128k-instruct",
    phi_3_small_8k_instruct: "microsoft/phi-3-small-8k-instruct",
    phi_3_mini_128k_instruct: "microsoft/phi-3-mini",
    phi_3_mini_4k_instruct: "microsoft/phi-3-mini-4k",

    // === Swallow (Tokyo Tech / Institute of Science Tokyo) ===
    llama_3_1_swallow_70b_instruct_v0_1: "institute-of-science-tokyo/llama-3.1-swallow-70b-instruct-v0.1",
    llama_3_1_swallow_8b_instruct_v0_1: "institute-of-science-tokyo/llama-3.1-swallow-8b-instruct-v0.1",
    llama_3_swallow_70b_instruct_v0_1: "tokyotech-llm/llama-3-swallow-70b-instruct-v01",

    // === Other Community / Regional Models ===
    bielik_11b_v2_6_instruct: "speakleash/bielik-11b-v2.6-instruct",
    teuken_7b_instruct_commercial_v0_4: "opengpt-x/teuken-7b-instruct-commercial-v0.4",
    granite_3_3_8b_instruct: "ibm/granite-3.3-8b-instruct",
    dracarys_llama_3_1_70b_instruct: "abacusai/dracarys-llama-3.1-70b-instruct",
    llama_3_taiwan_70b_instruct: "yentinglin/llama-3-taiwan-70b-instruct",
    rakutenai_7b_instruct: "rakuten/rakutenai-7b-instruct",
    rakutenai_7b_chat: "rakuten/rakutenai-7b-chat",
    breeze_7b_instruct: "mediatek/breeze-7b-instruct",
    chatglm3_6b: "thudm/chatglm3-6b",
    baichuan2_13b_chat: "baichuan-inc/baichuan2-13b-chat",
    eurollm_9b_instruct: "utter-project/eurollm-9b-instruct",
    falcon3_7b_instruct: "tiiuae/falcon3-7b-instruct",
    italia_10b_instruct_16k: "igenius/italia_10b_instruct_16k",
    colosseum_355b_instruct_16k: "igenius/colosseum_355b_instruct_16k",
    marin_8b_instruct: "marin/marin-8b-instruct",
    sarvam_m: "sarvamai/sarvam-m",
    stockmark_2_100b_instruct: "stockmark/stockmark-2-100b-instruct",
    seed_oss_36b_instruct: "bytedance/seed-oss-36b-instruct",

    // === Specialized / Less Common ===
    usdcode: "nvidia/usdcode",
    riva_translate_4b_instruct: "nvidia/riva-translate-4b-instruct",
    minimax_m2: "minimaxai/minimax-m2",
    kimi_k2_instruct_0905: "moonshotai/kimi-k2-instruct-0905",
    kimi_k2_instruct: "moonshotai/kimi-k2-instruct",
    jamba_1_5_mini_instruct: "ai21labs/jamba-1.5-mini-instruct",
    chatqa_1_5_8b: "nvidia/chatqa-1.5-8b",
    gpt_oss_120b: "openai/gpt-oss-120b",
    gpt_oss_20b: "openai/gpt-oss-20b",
} as const;

export type NvidiaModelId = keyof typeof nvidiaModels;
// or if you prefer the string union:
// export type NvidiaModelId = typeof nvidiaModels[keyof typeof nvidiaModels];