'use client';

import { useEffect, useRef } from 'react';
export default function ElevenLabsWidget() {
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Only load the script once
    if (!scriptLoadedRef.current) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.async = true;
      script.type = 'text/javascript';
      
      // Add error handling
      script.onload = () => {
        console.log('ElevenLabs ConvAI widget loaded successfully');
      };
      
      script.onerror = () => {
        console.error('Failed to load ElevenLabs ConvAI widget');
      };

      document.head.appendChild(script);
      scriptLoadedRef.current = true;
    }
  }, []);

  return (
    <div 
      dangerouslySetInnerHTML={{
        __html: `<elevenlabs-convai agent-id="${process.env.ELEVENLABS_WIDGET_ID}"></elevenlabs-convai>`
      }}
    />
  );
}
