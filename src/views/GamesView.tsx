/**
 * Catalogo de juegos
 * ==================
 * Es la portada del producto. La forma no es decorativa: comunica la tesis del
 * proyecto. Un optimizador es una pagina; un catalogo de optimizadores hechos
 * por la comunidad es una plataforma, y eso es lo que el motor permite ser.
 *
 * Decisiones de esta pantalla:
 *
 *  - Un heroe a sangre con el arte de fondo y el texto a la izquierda, no un
 *    recuadro centrado con aire alrededor. El arte manda, la interfaz se calla.
 *  - Una sola rejilla. Antes habia dos listas separadas ("tus juegos" y
 *    "ejemplos") con cabeceras distintas; ahora es un catalogo con filtros, que
 *    es como se navega una tienda.
 *  - Cada pieza dice QUE PUEDES HACER con ese juego (optimizador, inventario,
 *    personajes), no cuantas ranuras tiene. A nadie le importa el dato
 *    estructural hasta que ya entro.
 *  - Sin barra lateral: cuatro filtros en capsulas ocupan una linea y dejan el
 *    ancho completo para las caratulas.
 *
 * Las caratulas: el usuario puede poner la suya, y si no hay, se usa una de las
 * incluidas (ilustraciones propias, ver CoverPicker). No distribuimos arte de
 * juegos que no es nuestro, pero si damos el hueco donde colocarlo.
 */

import { useMemo, useState } from 'react'
import type { GameTemplate } from '../core/types'
import { enAncho, portadaDe, repartirPortadas } from '../ui/CoverPicker'
import { nf } from '../ui/format'

import type { ExampleInfo } from '../store/examples'

type Filtro = 'todas' | 'mias' | 'ejemplos'

/** Lo que la rejilla necesita saber de una pieza, venga de donde venga. */
interface Tarjeta {
  id: string
  nombre: string
  desc: string
  art: string
  propia: boolean
  meta: string
  etiqueta: string
  enUso: boolean
  accionTxt: string
  accion: () => void
  editarPortada?: () => void
}

export default function GamesView({
  templates, current, itemCounts, userGameIds, examples, loadingExample,
  query, onQuery, onTryExample, onPick, onAdd, onEditCover,
}: {
  templates: Record<string, GameTemplate>
  current: string
  itemCounts: Record<string, number>
  userGameIds: Set<string>
  examples: ExampleInfo[]
  loadingExample: string | null
  query: string
  onQuery: (q: string) => void
  /** Importa el ejemplo (si hace falta) y lleva directo al optimizador. */
  onTryExample: (info: ExampleInfo) => void
  onPick: (id: string) => void
  onAdd: () => void
  onEditCover: (id: string) => void
}) {
  const [filtro, setFiltro] = useState<Filtro>('todas')

  // Una portada distinta por plantilla: en una rejilla, dos iguales parecen un fallo.
  const arte = useMemo(
    () => repartirPortadas([...Object.keys(templates), ...examples.map((e) => e.id)]),
    [templates, examples],
  )

  const mias: Tarjeta[] = useMemo(
    () => Object.entries(templates).map(([id, t]) => ({
      id,
      nombre: t.name,
      desc: t.description || 'Sin descripcion',
      art: t.cover || arte[id] || portadaDe(id),
      propia: true,
      meta: `${nf.format(itemCounts[id] ?? 0)} objetos · ${t.slots.length} ranuras`,
      etiqueta: id === current ? 'En uso' : '',
      enUso: id === current,
      accionTxt: id === current ? 'Continuar' : 'Optimizar',
      accion: () => onPick(id),
      editarPortada: () => onEditCover(id),
    })),
    [templates, itemCounts, current, arte, onPick, onEditCover],
  )

  const ejemplos: Tarjeta[] = useMemo(
    () => examples.filter((e) => !userGameIds.has(e.id)).map((e) => ({
      id: e.id,
      nombre: e.name,
      desc: e.description,
      art: arte[e.id] || portadaDe(e.id),
      propia: false,
      meta: e.items > 0 ? `${nf.format(e.items)} objetos de muestra` : 'Sin objetos: carga los tuyos',
      etiqueta: 'Ejemplo',
      enUso: false,
      accionTxt: loadingExample === e.id ? 'Cargando…' : 'Probar',
      accion: () => onTryExample(e),
    })),
    [examples, userGameIds, arte, loadingExample, onTryExample],
  )

  const todas = useMemo(() => [...mias, ...ejemplos], [mias, ejemplos])

  const visibles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return todas
      .filter((c) => filtro === 'todas' || (filtro === 'mias' ? c.propia : !c.propia))
      .filter((c) => !q || `${c.nombre} ${c.desc}`.toLowerCase().includes(q))
  }, [todas, filtro, query])

  // El heroe muestra el juego en uso; si no hay ninguno, el primer ejemplo.
  const destacada = mias.find((c) => c.enUso) ?? mias[0] ?? ejemplos[0]

  const filtros: { id: Filtro; label: string; n: number }[] = [
    { id: 'todas', label: 'Todas', n: todas.length },
    { id: 'mias', label: 'Mias', n: mias.length },
    { id: 'ejemplos', label: 'Ejemplos', n: ejemplos.length },
  ]

  return (
    <>
      {destacada && (
        <section className="cat-hero">
          {/* La cabecera usa la variante apaisada: la vertical recortada a esta
              altura se queda en una franja del centro. */}
          <div className="cat-hero-art" style={{ backgroundImage: `url(${enAncho(destacada.art)})` }} aria-hidden />
          <div className="cat-hero-in">
            <p className="cat-eyebrow">{destacada.propia ? 'Donde lo dejaste' : 'Empieza por aqui'}</p>
            <h1>{destacada.nombre}</h1>
            <p className="cat-lead">{destacada.desc}</p>
            <div className="cat-cta">
              <button className="primary" onClick={destacada.accion}>
                {destacada.accionTxt}
                <span aria-hidden>&rarr;</span>
              </button>
              <span className="cat-meta-hero">{destacada.meta}</span>
            </div>
          </div>
        </section>
      )}

      <div className="cat-bar">
        <h2>Plantillas</h2>
        <span className="cat-count">{visibles.length} de {todas.length}</span>
        <div className="cat-spacer" />
        <div className="cat-chips" role="group" aria-label="Filtrar plantillas">
          {filtros.map((f) => (
            <button key={f.id} className={'cat-chip' + (filtro === f.id ? ' on' : '')}
              aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.label}<span>{f.n}</span>
            </button>
          ))}
        </div>
        <div className="cat-search">
          <span aria-hidden>⌕</span>
          <input type="text" value={query} onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar…" aria-label="Buscar una plantilla" />
          {query && <button className="mini" onClick={() => onQuery('')}>limpiar</button>}
        </div>
      </div>

      <div className="cat-grid">
        {visibles.map((c) => (
          <article key={c.id} className={'cat-tile' + (c.enUso ? ' on' : '')}>
            <button className="cat-art" onClick={c.accion} aria-label={`Abrir ${c.nombre}`}>
              <img src={c.art} alt="" loading="lazy" />
              {c.etiqueta && <span className={'cat-badge' + (c.enUso ? ' uso' : '')}>{c.etiqueta}</span>}
              {c.editarPortada && (
                <span className="cat-editar" role="presentation"
                  onClick={(e) => { e.stopPropagation(); c.editarPortada?.() }}>
                  imagen
                </span>
              )}
            </button>
            <h3 className="cat-name">{c.nombre}</h3>
            <p className="cat-meta">{c.meta}</p>
            <p className="cat-desc">{c.desc}</p>
            <button className="cat-accion" onClick={c.accion}>{c.accionTxt}</button>
          </article>
        ))}

        <button className="cat-new" onClick={onAdd}>
          <span className="cat-new-ico" aria-hidden>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <span>
            <strong>Tu juego no esta aqui</strong>
            Arma su plantilla: que numeros tiene, que se equipa y como se calcula.
            Sin escribir codigo, y queda para quien la necesite.
          </span>
        </button>

        {visibles.length === 0 && (
          <p className="cat-vacio">Ninguna plantilla coincide con lo que buscas.</p>
        )}
      </div>
    </>
  )
}
