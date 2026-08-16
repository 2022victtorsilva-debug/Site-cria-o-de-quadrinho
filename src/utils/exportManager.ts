import type { ComicPage, Project } from '../types/project'

export function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  anchor.click()
}

async function renderPage(page: ComicPage | { canvas: Record<string, unknown>; width: number; height: number }, format: 'png' | 'jpeg' = 'png') {
  const { Canvas } = await import('fabric')
  const element = document.createElement('canvas')
  const canvas = new Canvas(element, { width: page.width, height: page.height, backgroundColor: '#ffffff' })
  await canvas.loadFromJSON(page.canvas)
  canvas.renderAll()
  const url = canvas.toDataURL({ format, quality: .95, multiplier: 1 })
  canvas.dispose()
  return url
}

export async function exportStoredProject(project: Project, singlePageId?: string) {
  const safeName = project.name.trim().replace(/[^a-z0-9áàâãéêíóôõúüç -]/gi, '').replace(/\s+/g, '-') || 'projeto'
  if (project.type === 'drawing') {
    const data = await renderPage({ canvas: project.project_data.canvas || { objects: [] }, width: project.project_data.width, height: project.project_data.height })
    downloadDataUrl(data, `${safeName}.png`)
    return
  }
  const pages = project.project_data.pages || []
  if (singlePageId) {
    const page = pages.find((item) => item.id === singlePageId)
    if (page) downloadDataUrl(await renderPage(page), `${safeName}-${page.name}.png`)
    return
  }
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'px', format: [project.project_data.width, project.project_data.height], orientation: project.project_data.width > project.project_data.height ? 'landscape' : 'portrait', hotfixes: ['px_scaling'] })
  for (let index = 0; index < pages.length; index++) {
    if (index) pdf.addPage([pages[index].width, pages[index].height], pages[index].width > pages[index].height ? 'landscape' : 'portrait')
    const data = await renderPage(pages[index], 'jpeg')
    pdf.addImage(data, 'JPEG', 0, 0, pages[index].width, pages[index].height, undefined, 'FAST')
  }
  pdf.save(`${safeName}.pdf`)
}
