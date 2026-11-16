// QA AI Agent · Quem sou eu (papel, seções, ações e projetos) vindos do servidor em GET /api/me
// A tela só esconde o que a pessoa não pode usar; quem barra de verdade é o servidor, em cada rota.
// Scripts clássicos carregados em ordem pelo index.html (escopo global compartilhado).

let ME = null; // null = sem servidor, ou servidor antigo: nada é escondido
const ACOES_UI = [
  'executar',
  'abrir-bug',
  'editar-consulta-jira',
  'gerir-pastas',
  'exportar-csv',
  'gerir-integracoes',
  'gerir-permissoes',
];
const podeUI = a => !ME || ME.acoes.includes('*') || ME.acoes.includes(a);
const veSecaoUI = s => !ME || ME.secoes.includes('*') || ME.secoes.includes(s);
const secaoDaTela = v => ({ aovivo: 'execucoes', detalhe: 'execucoes', config: 'configuracoes' })[v] || v;
const telaNegada = v => v !== 'agente' && !veSecaoUI(secaoDaTela(v));
const primeiraTela = () =>
  ['dashboard', 'execucoes', 'cenarios', 'analises', 'pipelines'].find(veSecaoUI) || 'dashboard';

function applyAccess() {
  $$('#nav button').forEach(b => (b.hidden = !veSecaoUI(secaoDaTela(b.dataset.view))));
  ACOES_UI.forEach(a => document.body.classList.toggle('no-' + a, !podeUI(a)));
  const w = $('#who');
  if (!ME) {
    w.hidden = true;
    return;
  }
  const proj = ME.todosProjetos ? 'Todos os projetos' : ME.projetos.map(p => p.nome).join(', ') || 'Nenhum projeto';
  w.hidden = false;
  w.innerHTML = `<b>${esc(ME.nome)}</b><span>${esc(ME.papelNome)}</span><small>${esc(proj)}</small>`;
}

async function loadMe() {
  if (!API) return;
  try {
    const r = await fetch(API + '/api/me', { headers: apiHeaders(false) });
    if (r.status === 404) return; // servidor antigo: sem papéis
    if (!r.ok) throw new Error(String(r.status));
    ME = await r.json();
  } catch (_) {
    return; // sem /api/me o servidor continua barrando; a tela só não esconde nada
  }
  applyAccess();
  if (typeof renderCfg === 'function') renderCfg();
  show(location.hash.slice(1)); // se a tela atual não é permitida, vai para a primeira que for
}
