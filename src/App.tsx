import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { RotateCw } from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

export default function Component() {
  const [src, setSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const imgRef = useRef<HTMLImageElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader()
      reader.addEventListener('load', () => setSrc(reader.result?.toString() || null))
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const onImageLoad = useCallback(
    (img: HTMLImageElement) => {
      if (aspect) {
        const { width, height } = img
        setCrop(centerAspectCrop(width, height, aspect))
      }
    },
    [aspect]
  )

  const centerAspectCrop = (mediaWidth: number, mediaHeight: number, aspect: number) => {
    const cropWidth = Math.min(mediaWidth, mediaHeight * aspect)
    const cropHeight = cropWidth / aspect

    return {
      unit: '%',
      width: (cropWidth / mediaWidth) * 100,
      height: (cropHeight / mediaHeight) * 100,
      x: ((mediaWidth - cropWidth) / 2 / mediaWidth) * 100,
      y: ((mediaHeight - cropHeight) / 2 / mediaHeight) * 100,
    }
  }

  const handleToggleAspectClick = useCallback(() => {
    if (aspect) {
      setAspect(undefined)
    } else if (imgRef.current) {
      const { width, height } = imgRef.current
      setAspect(16 / 9)
      setCrop(centerAspectCrop(width, height, 16 / 9))
    }
  }, [aspect])

  const handleDownloadClick = () => {
    if (!previewCanvasRef.current) {
      return
    }

    previewCanvasRef.current.toBlob((blob) => {
      if (!blob) {
        return
      }
      const previewUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.download = 'cropped-image.png'
      anchor.href = previewUrl
      anchor.click()
      window.URL.revokeObjectURL(previewUrl)
    })
  }

  const updatePreviewCanvas = useCallback(() => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) {
      return
    }

    const image = imgRef.current
    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const pixelRatio = window.devicePixelRatio

    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio)
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio)

    ctx.scale(pixelRatio, pixelRatio)
    ctx.imageSmoothingQuality = 'high'

    const cropX = completedCrop.x * scaleX
    const cropY = completedCrop.y * scaleY
    const centerX = image.naturalWidth / 2
    const centerY = image.naturalHeight / 2

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom, zoom)
    ctx.translate(-centerX, -centerY)
    ctx.drawImage(
      image,
      cropX,
      cropY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    )

    ctx.restore()
  }, [completedCrop, rotation, zoom])

  React.useEffect(() => {
    updatePreviewCanvas()
  }, [updatePreviewCanvas])

  return (
    <div className='container mx-auto p-4'>
      <Input type='file' accept='image/*' onChange={onSelectFile} className='mb-4' />
      {src && (
        <div>
          <div className='flex flex-wrap gap-4 mb-4'>
            <div className='flex items-center gap-2'>
              <Label htmlFor='zoom'>Zoom:</Label>
              <Slider
                id='zoom'
                min={1}
                max={3}
                step={0.1}
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                className='w-[200px]'
              />
            </div>
            <div className='flex items-center gap-2'>
              <Label htmlFor='rotation'>Rotation:</Label>
              <Slider
                id='rotation'
                min={0}
                max={360}
                value={[rotation]}
                onValueChange={(value) => setRotation(value[0])}
                className='w-[200px]'
              />
              <Button variant='outline' size='icon' onClick={() => setRotation((prev) => (prev + 90) % 360)}>
                <RotateCw className='h-4 w-4' />
              </Button>
            </div>
            <div className='flex items-center gap-2'>
              <Switch id='aspect' checked={!!aspect} onCheckedChange={handleToggleAspectClick} />
              <Label htmlFor='aspect'>Lock Aspect (16:9)</Label>
            </div>
          </div>
          <div className='flex flex-wrap gap-4'>
            <div className='flex-1 min-w-[300px]'>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
              >
                <img
                  ref={imgRef}
                  alt='Crop me'
                  src={src}
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                  onLoad={(e) => onImageLoad(e.currentTarget)}
                />
              </ReactCrop>
            </div>
            <div className='flex-1 min-w-[300px]'>
              <canvas
                ref={previewCanvasRef}
                style={{
                  objectFit: 'contain',
                  width: completedCrop?.width,
                  height: completedCrop?.height,
                }}
              />
            </div>
          </div>
          <Button onClick={handleDownloadClick} className='mt-4'>
            Download Cropped Image
          </Button>
        </div>
      )}
    </div>
  )
}
