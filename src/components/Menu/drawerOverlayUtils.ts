/**

 * Forwards events from a drawer overlay to the MenuBar element.
 * Uses getBoundingClientRect() to map coordinates from overlay to MenuBar.
 *
 * @param overlayElement - The overlay element to listen for events on
 * @param menuBarElement - The MenuBar element instance
 */
export function forwardOverlayEventsToMenuBar(
  overlayElement: HTMLElement | null | undefined,
  menuBarElement: HTMLElement | null | undefined,
): () => void {
  if (!overlayElement || !menuBarElement) {
    return () => {}; // No-op cleanup if no overlay or menuBar
  }

  const forwardEventToMenuBar = (event: MouseEvent | TouchEvent) => {
    const menuRect = menuBarElement.getBoundingClientRect();

    // Get event coordinates
    let clientX: number;
    let clientY: number;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event instanceof TouchEvent && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      return;
    }

    // Check if the click is actually on the MenuBar element (not just within bounds)
    // Since we're called from documentPointerHandler when click is on overlay,
    // we should only skip if elementFromPoint finds MenuBar (not overlay)
    const elementAtClickPoint = document.elementFromPoint(clientX, clientY);
    const isActuallyOnMenuBar =
      elementAtClickPoint &&
      (elementAtClickPoint === menuBarElement || menuBarElement.contains(elementAtClickPoint));

    if (isActuallyOnMenuBar) {
      return; // Event is actually on MenuBar element, don't forward
    }

    // Calculate relative position within MenuBar based on overlay click position
    // Map the overlay click to a corresponding position in MenuBar
    const relativeX = clientX - menuRect.left;
    const relativeY = clientY - menuRect.top;

    // Find element at the mapped position in MenuBar
    const targetX = menuRect.left + Math.max(0, Math.min(relativeX, menuRect.width));
    const targetY = menuRect.top + Math.max(0, Math.min(relativeY, menuRect.height));

    // Try elementFromPoint, but if it returns overlay, find buttons directly in MenuBar
    let elementAtPoint = document.elementFromPoint(targetX, targetY);

    // If elementFromPoint returns the overlay (because it's on top), find buttons directly in MenuBar
    if (
      !elementAtPoint ||
      !menuBarElement.contains(elementAtPoint) ||
      elementAtPoint === overlayElement
    ) {
      // Find all clickable elements (buttons) in MenuBar
      const buttons = menuBarElement.querySelectorAll('button, [role="button"], a[href]');

      // Find the button closest to the ORIGINAL click position (not the mapped position)
      // This ensures we find the button the user actually intended to click
      let closestButton: HTMLElement | null = null;
      let minDistance = Infinity;

      buttons.forEach((btn) => {
        if (btn instanceof HTMLElement) {
          const btnRect = btn.getBoundingClientRect();
          const btnCenterX = btnRect.left + btnRect.width / 2;
          const btnCenterY = btnRect.top + btnRect.height / 2;
          // Use original clientX/clientY instead of mapped targetX/targetY
          const distance = Math.sqrt(
            Math.pow(clientX - btnCenterX, 2) + Math.pow(clientY - btnCenterY, 2),
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestButton = btn;
          }
        }
      });

      if (closestButton) {
        elementAtPoint = closestButton;
      }
    }

    // If we found an interactive element in MenuBar, trigger click
    if (elementAtPoint && menuBarElement.contains(elementAtPoint)) {
      if (elementAtPoint instanceof HTMLElement) {
        // Create a synthetic click event and dispatch it directly on the element
        // Use a one-time listener to stop propagation if it tries to reach overlay
        const stopPropagationToOverlay = (e: Event) => {
          const target = e.target as HTMLElement;
          if (overlayElement && (target === overlayElement || overlayElement.contains(target))) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            document.removeEventListener('click', stopPropagationToOverlay, true);
          }
        };
        document.addEventListener('click', stopPropagationToOverlay, true);

        // Dispatch the click event - this will trigger the button's onClick handler
        const syntheticClick = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          detail: 1,
          clientX: targetX,
          clientY: targetY,
          button: 0,
          buttons: 1,
        });

        elementAtPoint.dispatchEvent(syntheticClick);

        // Remove the propagation stopper after a short delay
        setTimeout(() => {
          document.removeEventListener('click', stopPropagationToOverlay, true);
        }, 0);
      }
    } else {
      // Fallback: create a synthetic mouse event at the MenuBar center
      const centerX = menuRect.left + menuRect.width / 2;
      const centerY = menuRect.top + menuRect.height / 2;

      const syntheticEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY,
        button: event instanceof MouseEvent ? event.button : 0,
        buttons: event instanceof MouseEvent ? event.buttons : 0,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      });
      menuBarElement.dispatchEvent(syntheticEvent);
    }
  };

  const handleOverlayEvent = (event: Event) => {
    if (event instanceof MouseEvent || event instanceof TouchEvent) {
      const menuRect = menuBarElement.getBoundingClientRect();
      const clientX =
        event instanceof MouseEvent ? event.clientX : (event.touches[0]?.clientX ?? 0);
      const clientY =
        event instanceof MouseEvent ? event.clientY : (event.touches[0]?.clientY ?? 0);

      // Check if click is in MenuBar area - if so, prevent overlay from handling it
      const isInMenuBarArea =
        clientX >= menuRect.left &&
        clientX <= menuRect.right &&
        clientY >= menuRect.top &&
        clientY <= menuRect.bottom;

      if (isInMenuBarArea) {
        // Prevent the overlay's default behavior (like closing the drawer)
        event.stopPropagation();
        event.preventDefault();
        return; // MenuBar will handle it directly since it's above the overlay
      }

      // Forward events from overlay to MenuBar
      forwardEventToMenuBar(event);
      // Prevent overlay from closing drawer when forwarding to MenuBar
      event.stopPropagation();
    }
  };

  // Add event listeners to the overlay - use capture phase to catch events before corvu
  // Use capture phase to intercept events before corvu handles them
  overlayElement.addEventListener('click', handleOverlayEvent, true);
  overlayElement.addEventListener('touchend', handleOverlayEvent, true);
  // Also add bubble phase as backup
  overlayElement.addEventListener('click', handleOverlayEvent, false);
  overlayElement.addEventListener('touchend', handleOverlayEvent, false);

  // Add document-level listener to catch pointerup events in CAPTURE phase (before corvu handles them)
  // Corvu uses pointerup events for closeOnOutsidePointer, not click events
  const documentPointerHandler = (event: Event) => {
    // Only process in capture phase to intercept before corvu
    if (event.eventPhase !== Event.CAPTURING_PHASE) {
      return;
    }

    const target = event.target as HTMLElement;
    if (!target) {
      return;
    }

    const isOverlayOrChild = target === overlayElement || overlayElement.contains(target);
    const isMenuBarOrChild = target === menuBarElement || menuBarElement.contains(target);

    // If pointer event is on overlay (and not MenuBar), check if it's near MenuBar
    if (isOverlayOrChild && !isMenuBarOrChild && event instanceof PointerEvent) {
      const menuRect = menuBarElement.getBoundingClientRect();
      const clickX = event.clientX;
      const clickY = event.clientY;

      // Check if click is near MenuBar (within a reasonable distance, e.g., 100px)
      const distanceToMenuBar = Math.sqrt(
        Math.pow(Math.max(0, menuRect.left - clickX, clickX - menuRect.right), 2) +
          Math.pow(Math.max(0, menuRect.top - clickY, clickY - menuRect.bottom), 2),
      );
      const isNearMenuBar = distanceToMenuBar < 100; // 100px threshold

      // Only forward if click is near MenuBar; otherwise let corvu handle it (close drawer)
      if (isNearMenuBar) {
        // Convert PointerEvent to MouseEvent for forwarding
        const mouseEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: event.clientX,
          clientY: event.clientY,
          button: event.button,
          buttons: event.buttons,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
        });

        // Prevent corvu from closing the drawer FIRST
        event.stopImmediatePropagation();
        event.preventDefault();

        // Forward the event to MenuBar AFTER preventing corvu
        // Use setTimeout to ensure the synthetic click happens after the pointerup is fully handled
        setTimeout(() => {
          forwardEventToMenuBar(mouseEvent);
        }, 0);
      }
      // If not near MenuBar, let the event propagate to corvu so it can close the drawer
    }
  };

  // Add document-level listener to catch ALL clicks in CAPTURE phase (backup)
  const documentClickHandler = (event: Event) => {
    // Only process in capture phase to intercept before corvu
    if (event.eventPhase !== Event.CAPTURING_PHASE) {
      return;
    }

    const target = event.target as HTMLElement;
    if (!target) {
      return;
    }

    const isOverlayOrChild = target === overlayElement || overlayElement.contains(target);
    const isMenuBarOrChild = target === menuBarElement || menuBarElement.contains(target);

    // If click is on overlay (and not MenuBar), forward to MenuBar and prevent drawer close
    if (isOverlayOrChild && !isMenuBarOrChild && event instanceof MouseEvent) {
      // Forward the event to MenuBar
      forwardEventToMenuBar(event);

      // Prevent corvu from closing the drawer
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  };
  // Listen for pointerup events (what corvu uses) in capture phase
  document.addEventListener('pointerup', documentPointerHandler, true);
  // Also keep click/touchend listeners as backup
  document.addEventListener('click', documentClickHandler, true);
  document.addEventListener('touchend', documentClickHandler, true);

  // Return cleanup function
  return () => {
    overlayElement.removeEventListener('click', handleOverlayEvent, true);
    overlayElement.removeEventListener('touchend', handleOverlayEvent, true);
    overlayElement.removeEventListener('click', handleOverlayEvent, false);
    overlayElement.removeEventListener('touchend', handleOverlayEvent, false);
    document.removeEventListener('pointerup', documentPointerHandler, true);
    document.removeEventListener('click', documentClickHandler, true);
    document.removeEventListener('touchend', documentClickHandler, true);
  };
}
