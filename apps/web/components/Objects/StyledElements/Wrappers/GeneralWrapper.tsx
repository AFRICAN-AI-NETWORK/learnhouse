function GeneralWrapperStyled({ children, maxWidth = "max-w-(--breakpoint-2xl)" }: { children: React.ReactNode, maxWidth?: string }) {
  return (
    <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-5 tracking-tight z-50`}>
      {children}
    </div>
  )
}

export default GeneralWrapperStyled
