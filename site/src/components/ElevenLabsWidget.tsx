'use client';

import { useEffect, useState, useRef } from 'react';

// Global state to track the widget across page changes
const WIDGET_CONTAINER_ID = 'elevenlabs-widget-container';
let globalWidgetInitialized = false;
let globalScriptLoaded = false;

export default function ElevenLabsWidget() {
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
    mountedRef.current = true;

    const initializeWidget = async () => {
      // Check if widget container already exists globally
      let globalContainer = document.getElementById(WIDGET_CONTAINER_ID);
      
      if (globalContainer && globalWidgetInitialized) {
        // Widget already exists, no need to recreate
        return;
      }

      // Load script if not already loaded
      if (!globalScriptLoaded) {
        await loadScript();
      }

      // Create or reuse the global container
      if (!globalContainer) {
        globalContainer = document.createElement('div');
        globalContainer.id = WIDGET_CONTAINER_ID;
        globalContainer.style.position = 'fixed';
        globalContainer.style.bottom = '20px';
        globalContainer.style.right = '20px';
        globalContainer.style.zIndex = '1000';
        
        const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_WIDGET_ID || 'agent_0001k4ms75n2eyna60s2ymv97pmh';
        globalContainer.innerHTML = `<elevenlabs-convai agent-id="${agentId}"></elevenlabs-convai>`;
        
        document.body.appendChild(globalContainer);
        globalWidgetInitialized = true;
      }
    };

    initializeWidget();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
      if (existingScript) {
        globalScriptLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.async = true;
      script.type = 'text/javascript';

      script.onload = () => {
        console.log('ElevenLabs ConvAI widget loaded successfully');
        globalScriptLoaded = true;
        resolve();
      };

      script.onerror = () => {
        console.error('Failed to load ElevenLabs ConvAI widget');
        reject(new Error('Script failed to load'));
      };

      document.head.appendChild(script);
    });
  };

  // This component doesn't render anything visible since the widget is attached to body
  if (!isClient) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      style={{ display: 'none' }}
      data-widget-placeholder="elevenlabs"
    />
  );
}
