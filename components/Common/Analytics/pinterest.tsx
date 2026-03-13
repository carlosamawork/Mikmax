import Script from 'next/script'

export default function PinterestTag() {
  const PINTEREST_ID = process.env.NEXT_PUBLIC_PINTEREST_ID
  if (!PINTEREST_ID) return null

  return (
    <>
      <Script id="pinterest-tag" strategy="afterInteractive">
        {`
          !function(e){if(!window.pintrk){window.pintrk = function () {
          window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
          n=window.pintrk;n.queue=[],n.version="3.0";var
          t=document.createElement("script");t.async=!0,t.src=e;var
          r=document.getElementsByTagName("script")[0];
          r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");

          pintrk('load', '${PINTEREST_ID}');
          pintrk('page');
        `}
      </Script>

      <noscript
        dangerouslySetInnerHTML={{
          __html: `<img height="1" width="1" style="display:none;" alt="" src="https://ct.pinterest.com/v3/?event=init&tid=${PINTEREST_ID}&noscript=1" />`,
        }}
      />
    </>
  )
}
