import imageCompression from 'browser-image-compression'
import type { AIImageResult } from '../types/project'
import { getCurrentUserId, supabase } from './supabase'

const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const maxOriginalSize = 15 * 1024 * 1024

export async function prepareImage(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error('Use uma imagem PNG, JPG ou WebP.')
  if (file.size > maxOriginalSize) throw new Error('A imagem deve ter no máximo 15 MB.')
  if (file.size < 1_500_000) return file
  return imageCompression(file, { maxSizeMB: 1.5, maxWidthOrHeight: 2400, useWebWorker: true, fileType: file.type })
}

export async function uploadImage(file: File, folder = 'uploads') {
  const compressed = await prepareImage(file)
  if (!supabase) return { url: URL.createObjectURL(compressed), storagePath: undefined }
  const userId = await getCurrentUserId()
  if (!userId) return { url: URL.createObjectURL(compressed), storagePath: undefined }
  const ext = compressed.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('project-assets').upload(path, compressed, {
    contentType: compressed.type, cacheControl: '31536000', upsert: false,
  })
  if (error) throw error
  const { data } = await supabase.storage.from('project-assets').createSignedUrl(path, 3600)
  if (!data?.signedUrl) throw new Error('Não foi possível abrir a imagem enviada.')
  return { url: data.signedUrl, storagePath: path }
}

export async function persistRemoteImage(result: AIImageResult) {
  if (result.storagePath) return result
  const response = await fetch(result.url)
  if (!response.ok) throw new Error('Não foi possível baixar essa imagem.')
  const blob = await response.blob()
  const type = allowedTypes.has(blob.type) ? blob.type : 'image/png'
  const file = new File([blob], `${result.id}.${type.split('/')[1]}`, { type })
  const saved = await uploadImage(file, 'search')
  return { ...result, ...saved }
}

export async function requestImages(prompt: string): Promise<AIImageResult[]> {
  if (!supabase) throw new Error('O Supabase ainda não está configurado.')
  const session = await supabase.auth.getSession()
  if (!session.data.session) throw new Error('O salvamento online ainda não está disponível neste dispositivo.')
  const { data, error } = await supabase.functions.invoke('search-images', {
    body: { prompt },
  })
  if (error) throw new Error(error.message || 'O serviço de imagens não respondeu.')
  if (!Array.isArray(data?.images) || data.images.length !== 3) {
    throw new Error(data?.message || 'Não foi possível obter três imagens válidas. Tente de novo.')
  }
  return data.images
}
