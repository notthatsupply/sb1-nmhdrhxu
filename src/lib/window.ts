import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

type ComponentProps<T> = T & { onClose: () => void };

interface OpenWindowOptions {
  title: string;
  width?: number;
  height?: number;
}

export async function openInNewWindow(
  Component: React.ComponentType<any>,
  props: any,
  options: OpenWindowOptions
) {
  try {
    // First try opening with window.open()
    const newWindow = window.open(
      '',
      '_blank',
      `width=${options.width || 1200},height=${options.height || 800}`
    );

    if (!newWindow) {
      throw new Error('Popup blocked');
    }

    // Set window title
    newWindow.document.title = options.title;

    // Copy meta viewport for mobile
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      const newViewport = viewport.cloneNode(true);
      newWindow.document.head.appendChild(newViewport);
    }

    // Copy all stylesheets
    const styles = Array.from(document.styleSheets);
    for (const style of styles) {
      try {
        if (style.href) {
          const link = newWindow.document.createElement('link');
          link.rel = 'stylesheet';
          link.href = style.href;
          newWindow.document.head.appendChild(link);
        } else if (style.cssRules) {
          const styleEl = newWindow.document.createElement('style');
          for (const rule of Array.from(style.cssRules)) {
            styleEl.appendChild(
              newWindow.document.createTextNode(rule.cssText + '\n')
            );
          }
          newWindow.document.head.appendChild(styleEl);
        }
      } catch (e) {
        console.warn('Error copying stylesheet:', e);
      }
    }

    // Create root element
    const root = newWindow.document.createElement('div');
    root.id = 'root';
    newWindow.document.body.appendChild(root);

    // Render component
    const reactRoot = createRoot(root);
    reactRoot.render(
      React.createElement(StrictMode, null,
        React.createElement(Component, {
          ...props,
          onClose: () => newWindow.close()
        } as ComponentProps<typeof props>)
      )
    );

    // Handle window close
    newWindow.addEventListener('beforeunload', () => {
      try {
        reactRoot.unmount();
      } catch (e) {
        console.warn('Error unmounting component:', e);
      }
    });

    return newWindow;
  } catch (error) {
    // Propagate error to be handled by caller
    console.error('Error opening window:', error);
    throw error;
  }
}