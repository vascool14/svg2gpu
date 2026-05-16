import { useEffect, useId, useMemo, useState } from "react"
import { Svg2GPU } from "svg2gpu"
import type { SvgDemoFixture } from "./svgFixtures"
import { compileFixture, runCompileChecks, summarizeChecks } from "./demoChecks"

type RenderStatus =
  | { kind: "pending"; message: string }
  | { kind: "ready"; message: string }
  | { kind: "error"; message: string }

type Svg2GpuPreviewProps = {
  fixture: SvgDemoFixture
}

function StatusPill({ passed }: { passed: boolean }) {
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-semibold ${
        passed ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"
      }`}
    >
      {passed ? "PASS" : "FAIL"}
    </span>
  )
}

export default function Svg2GpuPreview({ fixture }: Svg2GpuPreviewProps) {
  const reactId = useId()
  const rootId = useMemo(
    () => `svg2gpu-demo-${reactId.replace(/\W+/g, "-")}`,
    [reactId],
  )
  const [renderStatus, setRenderStatus] = useState<RenderStatus>({
    kind: "pending",
    message: "WebGPU renderer has not started yet.",
  })

  const scene = useMemo(() => compileFixture(fixture), [fixture])
  const checks = useMemo(() => runCompileChecks(fixture, scene), [fixture, scene])
  const allChecksPassed = checks.every(check => check.passed)

  useEffect(() => {
    let cancelled = false
    let instance: Svg2GPU | null = null
    const publishStatus = (status: RenderStatus) => {
      queueMicrotask(() => {
        if (!cancelled) setRenderStatus(status)
      })
    }

    try {
      instance = new Svg2GPU(rootId, {
        svg: fixture.svg,
        antialias: true,
        background: [0.015, 0.018, 0.024, 1],
        fit: "contain",
        flattenTolerance: 0.35,
      })

      instance.ready
        .then(() => {
          if (cancelled) return
          setRenderStatus({
            kind: "ready",
            message: "Rendered through Svg2GPU WebGPU.",
          })
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setRenderStatus({
            kind: "error",
            message: error instanceof Error ? error.message : "WebGPU rendering failed.",
          })
        })
    } catch (error) {
      publishStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "WebGPU rendering failed.",
      })
    }

    return () => {
      cancelled = true
      instance?.destroy()
      const root = document.getElementById(rootId)
      if (root) root.innerHTML = ""
    }
  }, [fixture, rootId])

  return (
    <article className="flex w-full flex-col gap-4" data-demo-status={allChecksPassed ? "pass" : "fail"}>
      <header className="flex flex-col gap-2 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-white">{fixture.title}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/62">{fixture.description}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/75">
            {summarizeChecks(checks)}
          </div>
        </div>
      </header>

      <div className="grid min-h-[24rem] grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="flex min-h-[22rem] flex-col overflow-hidden rounded-lg border border-white/10 bg-black/25">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-white/70">Native SVG</h2>
            <span className="text-xs text-white/45">browser baseline</span>
          </div>
          <div className="grid flex-1 place-items-center p-4">
            <div
              className="w-full max-w-[38rem]"
              dangerouslySetInnerHTML={{ __html: fixture.svg }}
            />
          </div>
        </section>

        <section className="flex min-h-[22rem] flex-col overflow-hidden rounded-lg border border-white/10 bg-black/25">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-white/70">Svg2GPU</h2>
            <span
              className={`text-xs ${
                renderStatus.kind === "ready"
                  ? "text-emerald-300"
                  : renderStatus.kind === "error"
                    ? "text-rose-300"
                    : "text-white/45"
              }`}
            >
              {renderStatus.kind}
            </span>
          </div>
          <div className="relative min-h-[19rem] flex-1">
            <div id={rootId} className="absolute inset-0" />
            {renderStatus.kind === "error" ? (
              <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm leading-6 text-rose-200">
                {renderStatus.message}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-white/70">Scene Stats</h2>
          <dl className="grid grid-cols-3 gap-3">
            <div>
              <dt className="text-xs text-white/45">Batches</dt>
              <dd className="mt-1 text-2xl font-semibold text-white">{scene.stats.batches}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">Vertices</dt>
              <dd className="mt-1 text-2xl font-semibold text-white">{scene.stats.vertices}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">Indices</dt>
              <dd className="mt-1 text-2xl font-semibold text-white">{scene.stats.indices}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-white/70">Demo Checks</h2>
          <div className="grid gap-2">
            {checks.map(check => (
              <div
                key={check.label}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-md bg-white/[0.035] px-3 py-2"
              >
                <StatusPill passed={check.passed} />
                <div>
                  <div className="text-sm font-medium text-white">{check.label}</div>
                  <div className="text-xs leading-5 text-white/50">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </article>
  )
}
