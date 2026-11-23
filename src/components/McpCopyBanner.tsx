"use client";

import { useState } from "react";
import { Check, Code2, Copy } from "@/components/Icons";

const MCP_ENDPOINT = "https://airnodehub.api3.org/mcp";

const MCP_CONFIG_JSON = JSON.stringify(
  {
    mcpServers: {
      airnodehub: {
        url: MCP_ENDPOINT,
      },
    },
  },
  null,
  2
);

interface McpCopyBannerProps {
  proofId?: string;
}

export function McpCopyBanner({ proofId }: McpCopyBannerProps) {
  const [copiedTarget, setCopiedTarget] = useState<"url" | "json" | null>(null);
  const [showJson, setShowJson] = useState(false);

  async function handleCopy(target: "url" | "json") {
    const text = target === "url" ? MCP_ENDPOINT : MCP_CONFIG_JSON;
    await navigator.clipboard.writeText(text);
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 2200);

    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "mcp_config_copies",
        proofId,
        meta: { target },
      }),
    }).catch(() => {});
  }

  return (
    <section
      aria-label="AirnodeHub Developer MCP Integration"
      className="border border-[#2B2B2B] bg-[#181818]"
    >
      <div className="px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          <span className="px-2 py-0.5 border border-[#16A34A]/60 bg-[#16A34A]/10 text-[#16A34A] text-[10px] font-bold uppercase tracking-wider">
            BUILDERS
          </span>
          <span className="text-[#D6D3C9]">
            Pulled with zero API keys via a single MCP endpoint and x402
            micropayments.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <code className="px-2.5 py-1.5 bg-[#111111] border border-[#2B2B2B] text-[#B8B5AA] text-[11px]">
            {MCP_ENDPOINT}
          </code>

          <button
            type="button"
            onClick={() => handleCopy("url")}
            className="px-3 py-1.5 border border-[#2B2B2B] hover:border-[#F3F1EA] bg-[#111111] text-[#F3F1EA] text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copiedTarget === "url" ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>COPIED URL</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPY URL</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleCopy("json")}
            className="px-3 py-1.5 border border-[#F3F1EA] bg-[#F3F1EA] hover:bg-white text-[#121212] text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copiedTarget === "json" ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>COPIED MCP JSON</span>
              </>
            ) : (
              <>
                <Code2 className="w-3.5 h-3.5" />
                <span>COPY MCP CONFIG</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowJson((v) => !v)}
            className="px-2.5 py-1.5 text-[11px] text-[#8E8C84] hover:text-[#F3F1EA] uppercase tracking-wider cursor-pointer"
          >
            {showJson ? "HIDE" : "VIEW JSON"}
          </button>
        </div>
      </div>

      {showJson && (
        <div className="px-4 sm:px-6 pb-4 pt-2 border-t border-[#2B2B2B] bg-[#131313]">
          <pre className="font-mono text-xs text-[#D6D3C9] overflow-x-auto">
            {MCP_CONFIG_JSON}
          </pre>
        </div>
      )}
    </section>
  );
}
