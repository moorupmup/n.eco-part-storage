/**
 * Utility for client-side image compression and handling
 */

export async function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Try webp first, fallback to jpeg
        let dataUrl = canvas.toDataURL('image/webp', quality)
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }

        // Secondary compression pass if image is still large (> 250KB in base64)
        if (dataUrl.length > 250000) {
          const secondCanvas = document.createElement('canvas')
          const scale = 0.75
          secondCanvas.width = Math.round(width * scale)
          secondCanvas.height = Math.round(height * scale)
          const secondCtx = secondCanvas.getContext('2d')
          if (secondCtx) {
            secondCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height)
            let secondUrl = secondCanvas.toDataURL('image/webp', 0.65)
            if (!secondUrl.startsWith('data:image/webp')) {
              secondUrl = secondCanvas.toDataURL('image/jpeg', 0.65)
            }
            if (secondUrl.length < dataUrl.length) {
              dataUrl = secondUrl
            }
          }
        }

        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsDataURL(file)
  })
}
