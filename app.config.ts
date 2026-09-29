export default defineAppConfig({
  ui: {
    primary: 'emerald',
    gray: 'zinc',
    strategy: 'merge',
    modal: {
      background: 'bg-transparent dark:bg-transparent',
      rounded: 'rounded-none',
      shadow: 'shadow-none',
      ring: '',
      inner: 'overflow-hidden',
      overlay: {
        background: 'bg-zinc-950/75 backdrop-blur-sm'
      }
    },
    dropdown: {
      popper: {
        strategy: 'absolute'
      }
    }
  }
})

