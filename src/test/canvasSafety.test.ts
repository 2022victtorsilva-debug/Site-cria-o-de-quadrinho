import { Rect } from 'fabric'
import { describe, expect, it } from 'vitest'
import { sanitizeObjectTransform } from '../editors/CanvasStage'

describe('segurança das transformações do canvas', () => {
  it('substitui NaN e Infinity por valores válidos', () => {
    const object = new Rect({ width: 100, height: 80, left: Number.NaN, top: Number.POSITIVE_INFINITY, scaleX: Number.NaN, scaleY: -Number.POSITIVE_INFINITY, angle: Number.NaN })
    sanitizeObjectTransform(object, 1000, 720)
    expect([object.left, object.top, object.scaleX, object.scaleY, object.angle].every((value) => Number.isFinite(value))).toBe(true)
    expect(object.scaleX).toBeGreaterThan(0)
    expect(object.scaleY).toBeGreaterThan(0)
  })

  it('impede que um elemento seja invertido ou fique menor que a área mínima', () => {
    const object = new Rect({ width: 200, height: 100, scaleX: -.0001, scaleY: -.0001 })
    ;(object as any).data = { role: 'element' }
    sanitizeObjectTransform(object, 1000, 720)
    expect(object.scaleX).toBe(object.scaleY)
    expect((object.width || 0) * (object.scaleX || 0)).toBeGreaterThanOrEqual(20)
  })
})
