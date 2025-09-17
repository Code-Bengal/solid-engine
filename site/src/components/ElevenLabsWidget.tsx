'use client';

import { useEffect, useState } from 'react';

// Global flag to ensure script is only loaded once across all instances
let globalScriptLoaded = false;
let globalScriptLoading = false;

export default function ElevenLabsWidget() {
  const [isClient, setIsClient] = useState(false);
  const [scriptReady, setScriptReady] = useState(globalScriptLoaded);

  useEffect(() => {
    // Mark as client-side
    setIsClient(true);

    // If script is already loaded, we're ready
    if (globalScriptLoaded) {
      setScriptReady(true);
      return;
    }

    // If script is currently loading, wait for it
    if (globalScriptLoading) {
      const checkReady = () => {
        if (globalScriptLoaded) {
          setScriptReady(true);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
      return;
    }

    // Load the script for the first time
    globalScriptLoading = true;
    
    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
    if (existingScript) {
      globalScriptLoaded = true;
      globalScriptLoading = false;
      setScriptReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';

    script.onload = () => {
      console.log('ElevenLabs ConvAI widget loaded successfully');
      globalScriptLoaded = true;
      globalScriptLoading = false;
      setScriptReady(true);
    };

    script.onerror = () => {
      console.error('Failed to load ElevenLabs ConvAI widget');
      globalScriptLoading = false;
    };

    document.head.appendChild(script);
  }, []);

  // Don't render anything on the server or while script is loading
  if (!isClient || !scriptReady) {
    return <div className="elevenlabs-widget-placeholder" style={{ display: 'none' }} />;
  }

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_WIDGET_ID || 'agent_0001k4ms75n2eyna60s2ymv97pmh';

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `<elevenlabs-convai agent-id="${agentId}"></elevenlabs-convai>`
      }}
    />
  );
}
