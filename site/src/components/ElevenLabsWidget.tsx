'use client';

import { useEffect, useRef, useState } from 'react';

export default function ElevenLabsWidget() {
  const scriptLoadedRef = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const [agentId, setAgentId] = useState<string>('');

  useEffect(() => {
    // Mark as client-side
    setIsClient(true);

    // Get the agent ID from environment variable
    const widgetId = process.env.NEXT_PUBLIC_ELEVENLABS_WIDGET_ID || 'agent_0001k4ms75n2eyna60s2ymv97pmh';
    setAgentId(widgetId);

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

  // Don't render anything on the server to prevent hydration mismatch
  if (!isClient) {
    return <div className="elevenlabs-widget-placeholder" />;
  }

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `<elevenlabs-convai agent-id="${agentId}"></elevenlabs-convai>`
      }}
    />
  );
}
