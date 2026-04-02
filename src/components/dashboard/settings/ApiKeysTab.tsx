"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { AIProvider } from "@/types";

interface ApiKeyRow {
  id: string;
  provider: AIProvider;
  model_preference: string | null;
  is_active: boolean;
  created_at: string;
}

const PROVIDERS: {
  id: AIProvider;
  name: string;
  defaultModel: string;
  guide: string;
}[] = [
  {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-4o",
    guide: "1. Go to platform.openai.com/api-keys\n2. Click 'Create new secret key'\n3. Copy the key (starts with sk-)\n4. Paste it below",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    defaultModel: "claude-sonnet-4-20250514",
    guide: "1. Go to console.anthropic.com/settings/keys\n2. Click 'Create Key'\n3. Copy the key (starts with sk-ant-)\n4. Paste it below",
  },
  {
    id: "google",
    name: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    guide: "1. Go to aistudio.google.com/apikey\n2. Click 'Create API key'\n3. Copy the key\n4. Paste it below",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    defaultModel: "deepseek-chat",
    guide: "1. Go to platform.deepseek.com/api-keys\n2. Click 'Create new API key'\n3. Copy the key\n4. Paste it below",
  },
];

export function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>(null);
  const [newKey, setNewKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    const { getUserApiKeys } = await import("@/lib/actions/api-keys");
    const data = await getUserApiKeys();
    setKeys(data as ApiKeyRow[]);
  }

  async function handleSave(provider: AIProvider) {
    if (!newKey.trim()) return;
    setSaving(true);
    setMessage(null);

    const { saveUserApiKey } = await import("@/lib/actions/api-keys");
    const providerConfig = PROVIDERS.find((p) => p.id === provider);
    const result = await saveUserApiKey(provider, newKey.trim(), providerConfig?.defaultModel);

    if (result.success) {
      setMessage({ type: "success", text: `${providerConfig?.name} key saved!` });
      setNewKey("");
      setExpandedProvider(null);
      await loadKeys();
    } else {
      setMessage({ type: "error", text: result.error || "Failed to save" });
    }
    setSaving(false);
  }

  async function handleDelete(provider: AIProvider) {
    const { deleteUserApiKey } = await import("@/lib/actions/api-keys");
    await deleteUserApiKey(provider);
    setKeys((prev) => prev.filter((k) => k.provider !== provider));
    setMessage({ type: "success", text: "Key removed." });
  }

  async function handleToggle(provider: AIProvider, isActive: boolean) {
    const { toggleUserApiKey } = await import("@/lib/actions/api-keys");
    await toggleUserApiKey(provider, isActive);
    setKeys((prev) =>
      prev.map((k) => (k.provider === provider ? { ...k, is_active: isActive } : k)),
    );
  }

  return (
    <div>
      <h3 className="mb-1 font-serif text-lg font-bold text-ink">AI API Keys</h3>
      <p className="mb-4 font-sans text-xs text-ink-secondary">
        Bring your own API key for a premium AI experience in Chat. Your key is used
        first; Go Virall&apos;s system key is the fallback.
      </p>

      {message && (
        <div
          className={cn(
            "mb-4 rounded px-3 py-2 font-sans text-xs",
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700",
          )}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {PROVIDERS.map((provider) => {
          const existing = keys.find((k) => k.provider === provider.id);
          const isExpanded = expandedProvider === provider.id;

          return (
            <div key={provider.id} className="rounded border border-rule">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-sans text-sm font-semibold text-ink">
                    {provider.name}
                  </span>
                  {existing && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-sans text-[10px] font-semibold",
                        existing.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {existing.is_active ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {existing ? (
                    <>
                      <button
                        onClick={() => handleToggle(provider.id, !existing.is_active)}
                        className="font-sans text-[10px] font-semibold uppercase tracking-wider text-ink-secondary hover:text-ink"
                      >
                        {existing.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
                        className="font-sans text-[10px] font-semibold uppercase tracking-wider text-editorial-red hover:text-editorial-red/80"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() =>
                        setExpandedProvider(isExpanded ? null : provider.id)
                      }
                      className="font-sans text-[10px] font-semibold uppercase tracking-wider text-editorial-red hover:text-editorial-red/80"
                    >
                      {isExpanded ? "Cancel" : "Add Key"}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-rule px-4 py-3">
                  <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
                    How to get your {provider.name} API key:
                  </p>
                  <pre className="mb-3 whitespace-pre-wrap font-mono text-xs text-ink-secondary">
                    {provider.guide}
                  </pre>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder={`Paste your ${provider.name} API key...`}
                      className="flex-1 rounded border border-rule bg-surface-cream px-3 py-2 font-mono text-xs text-ink placeholder-ink-secondary/50 outline-none focus:border-editorial-red"
                    />
                    <button
                      onClick={() => handleSave(provider.id)}
                      disabled={!newKey.trim() || saving}
                      className="rounded bg-editorial-red px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-wider text-white hover:bg-editorial-red/90 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                  <p className="mt-2 font-sans text-[10px] text-ink-secondary">
                    Model: {provider.defaultModel} &middot; Your key is encrypted at rest and never shared.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
