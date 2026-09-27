export function useClipboardCopy() {
  const toast = useToast()

  async function copyToClipboard(text: string, label = 'Скопировано') {
    const cleanText = text?.trim()
    if (!cleanText) return

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cleanText)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = cleanText
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '0'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      toast.add({
        title: `${label} скопирован`,
        description: cleanText,
        color: 'emerald',
        icon: 'i-lucide-copy-check',
        timeout: 1800
      })
    } catch {
      toast.add({
        title: 'Не удалось скопировать',
        description: 'Проверьте доступ к буферу обмена',
        color: 'red',
        timeout: 2000
      })
    }
  }

  return { copyToClipboard }
}
