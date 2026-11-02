/** Small local feedback, never an indication that a server mutation has succeeded. */
export function celebrateAssignment(anchor: HTMLElement, itemName: string, category?: string) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const name = itemName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const alcohol = /\b(biere|beer|celtia|beck.?s|heineken|wine|vin|rose|vodka|whisk[ey]*|rhum|rum|gin|tequila|cocktail|pastis|boukha)\b/.test(name);
  const emoji = alcohol ? '🍻' : /pizza/.test(name) ? '🍕' : /burger/.test(name) ? '🍔' : /frite|fries/.test(name) ? '🍟' : /crepe|dessert|gateau/.test(name) ? '😋' : category === 'drinks' ? '🥤' : '🍽️';
  const rect = anchor.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'assignment-delight';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${Math.max(40, Math.min(window.innerWidth - 40, rect.left + rect.width / 2))}px`;
  layer.style.top = `${Math.max(80, rect.top)}px`;
  for (const [index, symbol] of [emoji, '✨', alcohol ? '🫧' : '✨'].entries()) {
    const particle = document.createElement('span');
    particle.textContent = symbol;
    particle.style.setProperty('--drift', `${(index - 1) * 30}px`);
    particle.style.setProperty('--tilt', `${(index - 1) * 18}deg`);
    particle.style.animationDelay = `${index * 40}ms`;
    layer.appendChild(particle);
  }
  // Bound the number of particles during rapid taps.
  document.querySelectorAll('.assignment-delight').forEach(element => element.remove());
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1000);
}
