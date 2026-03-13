import { useEffect } from 'react';
import { useControllerActions, useControllerState } from '@/hooks/useController';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type Direction = 'ui_up' | 'ui_down' | 'ui_left' | 'ui_right';

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getContentCandidates(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => isVisible(el))
    .filter(el => !el.closest('aside'))
    .filter(el => !el.closest('header'));
}

function focusElement(el: HTMLElement | null) {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

function directionalScore(base: DOMRect, target: DOMRect, direction: Direction): number | null {
  if (direction === 'ui_up' && target.bottom > base.top) return null;
  if (direction === 'ui_down' && target.top < base.bottom) return null;
  if (direction === 'ui_left' && target.right > base.left) return null;
  if (direction === 'ui_right' && target.left < base.right) return null;

  const baseX = base.left + base.width / 2;
  const baseY = base.top + base.height / 2;
  const targetX = target.left + target.width / 2;
  const targetY = target.top + target.height / 2;

  const primary =
    direction === 'ui_up' ? baseY - targetY :
    direction === 'ui_down' ? targetY - baseY :
    direction === 'ui_left' ? baseX - targetX :
    targetX - baseX;

  const cross =
    direction === 'ui_up' || direction === 'ui_down'
      ? Math.abs(targetX - baseX)
      : Math.abs(targetY - baseY);

  return primary + cross * 0.35;
}

function moveFocus(direction: Direction) {
  const candidates = getContentCandidates();
  if (candidates.length === 0) return;

  const active = document.activeElement as HTMLElement | null;
  const current = active && candidates.includes(active) ? active : null;

  if (!current) {
    focusElement(candidates[0]);
    return;
  }

  const baseRect = current.getBoundingClientRect();
  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (candidate === current) continue;
    const score = directionalScore(baseRect, candidate.getBoundingClientRect(), direction);
    if (score === null) continue;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (best) {
    focusElement(best);
    return;
  }

  const main = document.querySelector('main');
  if (main) {
    const delta = direction === 'ui_down' ? 220 : direction === 'ui_up' ? -220 : 0;
    if (delta !== 0) main.scrollBy({ top: delta, behavior: 'smooth' });
  }
}

function triggerConfirm() {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return;

  if (active.tagName.toLowerCase() === 'input' || active.tagName.toLowerCase() === 'textarea') {
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    active.dispatchEvent(enterEvent);
    return;
  }

  active.click();
}

function triggerCancel() {
  const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  document.dispatchEvent(escEvent);
}

export function ControllerContentNavigator() {
  const { navScope } = useControllerState();

  useEffect(() => {
    if (navScope !== 'content') return;
    const active = document.activeElement as HTMLElement | null;
    if (active && isVisible(active) && !active.closest('aside') && !active.closest('header')) return;
    const candidates = getContentCandidates();
    focusElement(candidates[0] ?? null);
  }, [navScope]);

  useControllerActions(({ action }) => {
    if (navScope !== 'content') return;

    if (action === 'ui_up' || action === 'ui_down' || action === 'ui_left' || action === 'ui_right') {
      moveFocus(action);
      return;
    }

    if (action === 'ui_confirm') {
      triggerConfirm();
      return;
    }

    if (action === 'ui_cancel') {
      triggerCancel();
    }
  }, true);

  return null;
}
