import { useEffect } from 'react'

export const AdBanner = () => {
  useEffect(() => {
    // Load Google AdSense script
    if (!window.adsbygoogle) {
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-xxxxxxxxxxxxxxxx'
      script.crossOrigin = 'anonymous'
      document.head.appendChild(script)
    }

    // Push ad when component mounts
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.log('AdSense error:', e)
    }
  }, [])

  return (
    <div className="my-4">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-xxxxxxxxxxxxxxxx"
        data-ad-slot="1234567890"
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  )
}
