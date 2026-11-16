// QA AI Agent · Configurações › Permissões (pessoas, projetos, papéis e histórico)
// Só aparece para quem tem a ação "gerir-permissoes". Tudo é gravado no servidor (/api/access), que aplica as regras.
// A chave de uma pessoa aparece uma única vez, ao criar ou renovar.
// Scripts clássicos carregados em ordem pelo index.html (escopo global compartilhado).

let ACC = null; // última resposta de GET /api/access
let permTab = 'pessoas';
let ACC_ERR = '';
const PERM_TABS = [
  ['pessoas', 'Pessoas'],
  ['projetos', 'Projetos'],
  ['papeis', 'Papéis'],
  ['historico', 'Histórico'],
];

async function accApi(metodo, rota, corpo) {
  const r = await fetch(API + '/api/access' + rota, {
    method: metodo,
    headers: apiHeaders(!!corpo),
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `erro ${r.status}`);
  return j;
}
async function loadAcc() {
  try {
    ACC = await accApi('GET', '');
    ACC_ERR = '';
  } catch (e) {
    ACC_ERR = e.message;
  }
  renderPerm();
}
const lst = v => (v || '').split(/[\s,;]+/).filter(Boolean);
const chips = (a, vazio) =>
  a.length ? a.map(x => `<span class="chip-s">${esc(x)}</span>`).join('') : `<span class="perm-muted">${vazio}</span>`;
const nomeProj = id => (id === '*' ? 'Todos' : ACC.projetos.find(p => p.id === id)?.nome || id);
const quando = t => (t ? new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

function renderPerm() {
  const root = $('#permRoot');
  if (!root) return;
  if (!ACC) {
    root.innerHTML = `<p class="${ACC_ERR ? 'perm-err' : 'perm-muted'}">${esc(ACC_ERR || 'Carregando…')}</p>`;
    return;
  }
  const tabs = `<div class="perm-tabs" role="tablist">${PERM_TABS.map(([k, t]) => `<button type="button" role="tab" data-ptab="${k}" aria-selected="${permTab === k}" class="${permTab === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  let corpo = '';
  if (permTab === 'pessoas') {
    corpo = `<div class="perm-head"><p>Cada pessoa tem a própria chave, um papel e os projetos que pode ver.</p><button type="button" class="btn-pri" data-pnew="pessoa">+ Adicionar pessoa</button></div>
    <div class="table-wrap"><table><thead><tr><th>Pessoa</th><th>Papel</th><th>Projetos</th><th>Último uso</th><th></th></tr></thead><tbody>${
      ACC.pessoas
        .map(
          p =>
            `<tr><td><b>${esc(p.nome)}</b></td><td><span class="pill ${p.papel === 'gestor' ? 'run' : 'off'}">${esc(ACC.papeis[p.papel]?.nome || p.papel)}</span></td><td>${p.papel === 'gestor' ? '<span class="perm-muted">Todos (Gestor)</span>' : chips(p.projetos.map(nomeProj), 'Nenhum')}</td><td>${quando(p.usadaEm)}</td><td class="perm-act"><button type="button" class="btn-out" data-pedit="${p.id}">Editar</button><button type="button" class="btn-out" data-pkey="${p.id}">Nova chave</button><button type="button" class="btn-out danger" data-pdel="${p.id}">Remover</button></td></tr>`
        )
        .join('') ||
      '<tr><td colspan="5" class="perm-muted">Nenhuma pessoa ainda. A chave do servidor é o administrador de origem.</td></tr>'
    }</tbody></table></div>`;
  } else if (permTab === 'projetos') {
    corpo = `<div class="perm-head"><p>Um projeto reúne os pipelines (Jenkins e GitHub Actions) e os projetos do Jira que uma pessoa pode ver e acionar.</p><button type="button" class="btn-pri" data-pnew="projeto">+ Novo projeto</button></div>
    <div class="table-wrap"><table><thead><tr><th>Projeto</th><th>Pipelines</th><th>Jira</th><th>Pessoas</th><th></th></tr></thead><tbody>${
      ACC.projetos
        .map(
          p =>
            `<tr><td><b>${esc(p.nome)}</b></td><td>${chips(p.jobs, 'Nenhum')}</td><td>${chips(p.jira, 'Nenhum')}</td><td>${ACC.pessoas.filter(x => x.projetos.includes(p.id) || x.projetos.includes('*')).length}</td><td class="perm-act"><button type="button" class="btn-out" data-projedit="${p.id}">Editar</button><button type="button" class="btn-out danger" data-projdel="${p.id}">Remover</button></td></tr>`
        )
        .join('') ||
      '<tr><td colspan="5" class="perm-muted">Nenhum projeto. Sem projetos, quem não é Gestor não vê nenhum pipeline nem item do Jira.</td></tr>'
    }</tbody></table></div>`;
  } else if (permTab === 'papeis') {
    const cab = Object.entries(ACC.papeis);
    const cel = (id, p, tipo, item) =>
      p.fixo
        ? '<input type="checkbox" checked disabled aria-label="Gestor: acesso total">'
        : `<input type="checkbox" data-pmat="${id}|${tipo}|${item}" ${p[tipo].includes(item) ? 'checked' : ''} aria-label="${esc(p.nome)}">`;
    const tabela = (tit, tipo, itens) =>
      `<div class="table-wrap perm-mx"><table><thead><tr><th>${tit}</th>${cab.map(([id, p]) => `<th class="c">${esc(p.nome)}</th>`).join('')}</tr></thead><tbody>${itens
        .map(
          ([k, n]) =>
            `<tr><td>${esc(n)}</td>${cab.map(([id, p]) => `<td class="c">${cel(id, p, tipo, k)}</td>`).join('')}</tr>`
        )
        .join('')}</tbody></table></div>`;
    corpo = `<div class="perm-head"><p>Marque o que cada papel pode ver e fazer. O servidor aplica as mesmas regras às rotas da API.</p><button type="button" class="btn-out" data-pnew="papel">+ Novo papel</button></div>
    ${tabela('Seção (menu)', 'secoes', ACC.secoes)}${tabela('Ação', 'acoes', ACC.acoes)}
    <p class="perm-muted">O papel Gestor tem acesso total e não pode ser alterado, para ninguém ficar sem acesso às permissões. As marcas são salvas ao clicar.</p>
    <p class="perm-muted">${cab
      .filter(([id, p]) => !p.fixo)
      .map(
        ([id, p]) =>
          `${esc(p.nome)}: ${p.pessoas} pessoa(s) <button type="button" class="link-btn" data-prole-del="${id}">remover papel</button>`
      )
      .join(' · ')}</p>`;
  } else {
    corpo = `<p class="perm-muted">Últimas alterações de pessoas, projetos e papéis (sem chaves).</p><ul class="perm-hist">${
      ACC.historico.map(h => `<li><time>${quando(h.t)}</time> ${esc(h.texto)}</li>`).join('') ||
      '<li class="perm-muted">Sem alterações ainda.</li>'
    }</ul>`;
  }
  root.innerHTML = `<h2>Permissões</h2>${tabs}${ACC_ERR ? `<p class="perm-err">${esc(ACC_ERR)}</p>` : ''}${corpo}`;
}

/* ---------- formulários ---------- */
const projChecks = (sel = []) =>
  `<fieldset class="perm-fs"><legend>Projetos que pode ver</legend>${
    ACC.projetos
      .map(
        p =>
          `<label class="perm-chk"><input type="checkbox" name="proj" value="${p.id}" ${sel.includes(p.id) ? 'checked' : ''}> ${esc(p.nome)}</label>`
      )
      .join('') || '<span class="perm-muted">Crie um projeto antes (aba Projetos).</span>'
  }</fieldset>`;
const papelSel = sel =>
  `<div class="field"><label for="fPapel">Papel</label><div class="sel"><select id="fPapel" name="papel">${Object.entries(
    ACC.papeis
  )
    .map(([id, p]) => `<option value="${id}" ${id === sel ? 'selected' : ''}>${esc(p.nome)}</option>`)
    .join('')}</select></div></div>`;
const falha = e => {
  ACC_ERR = e.message;
  toast(e.message);
  renderPerm();
  return false;
};

function mostrarChave(nome, chave) {
  modal(
    'Chave de acesso',
    `<p>Entregue esta chave a <b>${esc(nome)}</b>. Ela <b>não será mostrada de novo</b>: se for perdida, gere outra.</p>
     <div class="secret-row"><input id="novaChave" readonly value="${esc(chave)}" aria-label="Chave de acesso"><button type="button" class="btn-out" id="copiarChave">Copiar</button></div>
     <p class="perm-muted">A pessoa abre a plataforma com <code>?api=https://…</code> e informa a chave na primeira vez.</p>`,
    () => true,
    { ok: 'Já guardei a chave', hideCancel: true }
  );
  $('#novaChave').select();
  $('#copiarChave').onclick = () =>
    navigator.clipboard?.writeText(chave).then(
      () => toast('Chave copiada'),
      () => $('#novaChave').select()
    );
}

function formPessoa(p) {
  modal(
    p ? `Editar ${esc(p.nome)}` : 'Adicionar pessoa',
    `<div class="field"><label for="fNome">Nome</label><input id="fNome" name="nome" maxlength="60" required value="${esc(p?.nome || '')}"></div>
     ${papelSel(p?.papel || 'analista')}${projChecks(p?.projetos || [])}
     <p class="perm-muted">O Gestor vê todos os projetos, qualquer que seja a marcação.</p>`,
    async fd => {
      const corpo = { nome: fd.get('nome'), papel: fd.get('papel'), projetos: fd.getAll('proj') };
      try {
        if (p) {
          await accApi('PUT', `/pessoas/${p.id}`, corpo);
          toast('Pessoa atualizada');
        } else {
          const r = await accApi('POST', '/pessoas', corpo);
          closeModal();
          await loadAcc();
          mostrarChave(r.pessoa.nome, r.chave);
          return false;
        }
        loadAcc();
      } catch (e) {
        return falha(e);
      }
    },
    { ok: p ? 'Salvar' : 'Criar e gerar chave' }
  );
}
function formProjeto(p) {
  modal(
    p ? `Editar projeto` : 'Novo projeto',
    `<div class="field"><label for="fNome">Nome</label><input id="fNome" name="nome" maxlength="60" required value="${esc(p?.nome || '')}"></div>
     <div class="field"><label for="fJobs">Pipelines</label><textarea id="fJobs" name="jobs" rows="3" placeholder="Checkout&#10;acme/loja/*">${esc((p?.jobs || []).join('\n'))}</textarea><small>Um por linha ou separados por vírgula. Use <code>*</code> para vários (por exemplo <code>acme/loja/*</code>). Valem os nomes que aparecem em Pipelines.</small></div>
     <div class="field"><label for="fJira">Projetos do Jira</label><input id="fJira" name="jira" placeholder="LOJA, PAG" value="${esc((p?.jira || []).join(', '))}"><small>Chaves de projeto do Jira (maiúsculas). Cenários, ciclos e cards cujas chaves começam com elas.</small></div>`,
    async fd => {
      try {
        const corpo = {
          nome: fd.get('nome'),
          jobs: lst(fd.get('jobs')),
          jira: lst(fd.get('jira')).map(x => x.toUpperCase()),
        };
        await accApi(p ? 'PUT' : 'POST', p ? `/projetos/${p.id}` : '/projetos', corpo);
        toast(p ? 'Projeto atualizado' : 'Projeto criado');
        loadAcc();
      } catch (e) {
        return falha(e);
      }
    },
    { ok: p ? 'Salvar' : 'Criar projeto' }
  );
}
function formPapel() {
  modal(
    'Novo papel',
    `<div class="field"><label for="fNome">Nome do papel</label><input id="fNome" name="nome" maxlength="60" required></div><p class="perm-muted">Depois de criar, marque as seções e ações na tabela.</p>`,
    async fd => {
      try {
        await accApi('POST', '/papeis', { nome: fd.get('nome'), secoes: ['dashboard'], acoes: [] });
        toast('Papel criado');
        loadAcc();
      } catch (e) {
        return falha(e);
      }
    },
    { ok: 'Criar papel' }
  );
}
function confirmar(titulo, texto, ok, fn) {
  modal(
    titulo,
    `<p>${texto}</p>`,
    async () => {
      try {
        await fn();
        loadAcc();
      } catch (e) {
        return falha(e);
      }
    },
    { ok, danger: true }
  );
}

document.addEventListener('click', async e => {
  const t = e.target;
  if (!t.closest || !$('#permRoot')?.contains(t)) return;
  const q = a => t.closest(`[${a}]`)?.getAttribute(a);
  if (q('data-ptab')) {
    permTab = q('data-ptab');
    return renderPerm();
  }
  const novo = q('data-pnew');
  if (novo) return { pessoa: () => formPessoa(), projeto: () => formProjeto(), papel: formPapel }[novo]();
  if (q('data-pedit')) return formPessoa(ACC.pessoas.find(p => p.id === q('data-pedit')));
  if (q('data-projedit')) return formProjeto(ACC.projetos.find(p => p.id === q('data-projedit')));
  if (q('data-pkey')) {
    const p = ACC.pessoas.find(x => x.id === q('data-pkey'));
    return confirmar(
      'Gerar nova chave',
      `A chave atual de <b>${esc(p.nome)}</b> deixa de funcionar na hora. Gerar uma nova?`,
      'Gerar nova chave',
      async () => {
        const r = await accApi('POST', `/pessoas/${p.id}/chave`);
        setTimeout(() => mostrarChave(p.nome, r.chave), 0);
      }
    );
  }
  if (q('data-pdel')) {
    const p = ACC.pessoas.find(x => x.id === q('data-pdel'));
    return confirmar('Remover pessoa', `<b>${esc(p.nome)}</b> perde o acesso na hora.`, 'Remover', () =>
      accApi('DELETE', `/pessoas/${p.id}`)
    );
  }
  if (q('data-projdel')) {
    const p = ACC.projetos.find(x => x.id === q('data-projdel'));
    return confirmar(
      'Remover projeto',
      `O projeto <b>${esc(p.nome)}</b> sai de todas as pessoas, que deixam de ver os pipelines e itens do Jira dele.`,
      'Remover',
      () => accApi('DELETE', `/projetos/${p.id}`)
    );
  }
  if (q('data-prole-del')) {
    const id = q('data-prole-del');
    return confirmar(
      'Remover papel',
      `Remover o papel <b>${esc(ACC.papeis[id].nome)}</b>? Só é possível se ninguém o usar.`,
      'Remover',
      () => accApi('DELETE', `/papeis/${id}`)
    );
  }
});
// marcar/desmarcar na tabela de papéis grava na hora
document.addEventListener('change', async e => {
  const m = e.target.getAttribute?.('data-pmat');
  if (!m) return;
  const [id, tipo, item] = m.split('|');
  const p = ACC.papeis[id];
  const nova = e.target.checked ? [...new Set([...p[tipo], item])] : p[tipo].filter(x => x !== item);
  try {
    await accApi('PUT', `/papeis/${id}`, {
      nome: p.nome,
      secoes: tipo === 'secoes' ? nova : p.secoes,
      acoes: tipo === 'acoes' ? nova : p.acoes,
    });
    p[tipo] = nova;
    toast('Permissão salva');
  } catch (err) {
    e.target.checked = !e.target.checked;
    toast(err.message);
  }
});
