'use client'

import { useRef } from 'react'
import { Camera, Image, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { compressImage, fileToDataUrl } from '@/lib/image-utils'

interface Props {
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  maxPhotos?: number
  label?: string
}

export function CameraCapture({ photos, onPhotosChange, maxPhotos = 10, label = 'Add Pages' }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const compressed = await Promise.all(
      files.map(async f => {
        const url = await fileToDataUrl(f)
        return compressImage(url)
      })
    )
    onPhotosChange([...photos, ...compressed].slice(0, maxPhotos))
    e.target.value = ''
  }

  function remove(i: number) {
    onPhotosChange(photos.filter((_, idx) => idx !== i))
  }

  const canAdd = photos.length < maxPhotos

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={`page ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-slate-900/80 rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-200" />
              </button>
              <span className="absolute bottom-1 left-1.5 bg-slate-900/75 text-[10px] text-slate-300 px-1.5 py-0.5 rounded-full font-medium">
                pg {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
          <Camera className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">No photos yet</p>
          <p className="text-xs text-slate-500 mt-1">Capture all pages of the RO for best results</p>
        </div>
      )}

      {canAdd && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100 h-11"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="w-4 h-4 mr-2" />
            Camera
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100 h-11"
            onClick={() => galleryRef.current?.click()}
          >
            <Image className="w-4 h-4 mr-2" />
            Gallery
          </Button>
        </div>
      )}

      {!canAdd && (
        <div className="flex items-center gap-2 text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-xs">Max {maxPhotos} pages reached. Remove a page to add more.</p>
        </div>
      )}

      <p className="text-xs text-slate-500 text-center">{photos.length}/{maxPhotos} pages captured</p>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
    </div>
  )
}
