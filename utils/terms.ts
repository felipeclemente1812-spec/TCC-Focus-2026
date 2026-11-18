// Pequeno aviso entre telas: a tela de Termos (aberta a partir do Cadastro) avisa o
// Cadastro quando a pessoa toca em "Li e aceito", para marcar a caixinha lá.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onTermsAccepted(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitTermsAccepted() {
  listeners.forEach((fn) => fn());
}
