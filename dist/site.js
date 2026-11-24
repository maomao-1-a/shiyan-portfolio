const projects = [
  { id: 'deep-learning', name: '深度学习平台', type: 'WEB / AI PLATFORM', start: 4, end: 19, cover: 13, summary: '白杨深度学习平台面向算法工程师与数据科学家，将数据集、开发、训练、模型管理与模型服务串成可追溯、可视化的工作流。', captions: ['项目概览', '平台背景与挑战', '业务需求', '信息架构与工作流', '组件库搭建', '字体系统', '颜色系统', '设计规范与组件库', '核心功能设计', '总览页', '数据资产化与版本管理', '训练与实验管理', '主要界面展示'] },
  { id: 'hospital', name: '回民医院', type: 'WEB / HEALTHCARE', start: 20, end: 26, cover: 22, summary: '北京回民医院移动护士站电脑端，以蓝色为主色，并用卡片组织患者信息，方便护士快速浏览。', captions: ['护士站概览', '图标设计', '患者信息与移动医护'] },
  { id: 'ordering', name: '日料点餐', type: 'APP / FOOD SERVICE', start: 27, end: 36, cover: 35, summary: '为自助日料场景设计的移动端点餐方案，覆盖商户、收银员、服务员和顾客四类角色，减少手工传单与重复查询。', captions: ['项目封面', '项目介绍', '需求分析', '设计分析', '设计规范', '首页点餐管理', '点餐流程', '空状态设计', '页面总览'] },
  { id: 'community', name: '太阳城智慧社区', type: 'APP / COMMUNITY', start: 37, end: 50, cover: 37, summary: '以居民服务为核心的社区应用，覆盖居民、保安、客服和维修人员，设计涵盖物业报修、生活缴费和个人中心。', captions: ['项目封面', '项目介绍', '需求分析', '设计语言', '风格定义', '字体与色彩', '图标设计', '首页展示', '服务入口', '物业报修', '生活缴费', '个人中心', '界面总览'] },
  { id: 'corporate', name: '企业官网', type: 'WEB / BRAND', start: 51, end: 59, cover: 51, summary: '白杨智能官网设计，展示品牌色彩、页面布局与主要页面。', captions: ['官网概览', '品牌色彩', '页面布局', '页面展示'] },
  { id: 'wechat-posters', name: '公众号海报', type: 'VISUAL / SOCIAL', start: 60, end: 62, cover: 61, summary: '面向微信公众号品牌传播的海报设计，包含绿色主题与节庆系列视觉。', captions: ['公众号品牌传播', '节庆海报（一）', '节庆海报（二）'] },
  { id: 'promotional-posters', name: '宣传海报', type: 'VISUAL / CAMPAIGN', start: 63, end: 63, cover: 63, summary: '宣传海报与线下展示场景。', captions: ['宣传海报展示'] },
];

const landing = document.querySelector('#landing');
const mainHeader = document.querySelector('.top');
const homeObserver = new IntersectionObserver(([entry]) => {
  mainHeader.classList.toggle('over-hero', entry.intersectionRatio >= .5);
}, { threshold: .5 });
homeObserver.observe(landing.querySelector('#home'));
history.scrollRestoration = 'manual';
const detail = document.querySelector('#detail');
const imageUrl = page => `assets/p-${String(page).padStart(2, '0')}.jpg`;
const projectUrl = project => `#project/${project.id}`;
const number = index => String(index + 1).padStart(2, '0');

const projectGrid = document.querySelector('#project-grid');
const projectView = document.querySelector('#project-view');
const projectBand = projectGrid.parentElement;
const slices = 16;
projectGrid.innerHTML = projects.map((project, index) => {
  const cover = imageUrl(project.start);
  const facets = Array.from({ length: slices }, (_, slice) => `<span class="cover-facet" style="--slice:${slice};--cover:url('${cover}')"></span>`).join('');
  return `<a class="card" href="${projectUrl(project)}" aria-label="查看详情：${project.name}" style="--order:${index}"><img src="${cover}" alt="" loading="lazy" decoding="async"><span class="cover-facets" aria-hidden="true">${facets}</span><span class="card-label"><small>${number(index)} / ${project.type}</small><b>${project.name}</b><span class="card-detail">查看详情</span></span></a>`;
}).join('');

projectView.addEventListener('click', () => {
  const staticView = projectBand.classList.toggle('static-view');
  projectView.setAttribute('aria-pressed', String(staticView));
  projectView.textContent = staticView ? '恢复流动' : '静态浏览';
});

const carouselObserver = new IntersectionObserver(([entry]) => {
  projectBand.classList.toggle('in-view', entry.isIntersecting);
});
carouselObserver.observe(projectBand);

function buildCaseViewer() {
  const thumbnails = projects.map(project => `<a class="case-thumb" href="${projectUrl(project)}"><span class="case-thumb-media"><img src="${imageUrl(project.start)}" alt="" width="1920" height="1080" loading="lazy" decoding="async"></span><span class="case-thumb-title">${project.name}</span></a>`).join('');
  const sections = projects.map(project => {
    const images = Array.from({ length: project.end - project.start + 1 }, (_, imageIndex) => {
      const caption = project.captions[imageIndex] || '界面展示';
      return `<img class="case-slide" src="${imageUrl(project.start + imageIndex)}" alt="${project.name}：${caption}" width="1920" height="1080" loading="lazy" decoding="async">`;
    }).join('');
    return `<article class="case-project" aria-label="${project.name}">${images}</article>`;
  }).join('');
  detail.innerHTML = `<div class="case-toolbar"><a class="detail-back" href="#projects"><span aria-hidden="true">←</span> <span class="detail-back-label">返回项目目录</span></a></div><div class="case-layout"><nav class="case-index" aria-label="项目封面索引">${thumbnails}</nav><div class="case-viewer" role="region" aria-label="作品图片" tabindex="0">${sections}</div></div>`;

  const viewer = detail.querySelector('.case-viewer');
  const index = detail.querySelector('.case-index');
  const covers = [...index.children];
  const cases = [...viewer.children];

  function markCase(active) {
    const cover = covers[active];
    if (cover.hasAttribute('aria-current')) return;
    index.querySelector('[aria-current]')?.removeAttribute('aria-current');
    cover.setAttribute('aria-current', 'location');
    const region = index.getBoundingClientRect();
    const tile = cover.getBoundingClientRect();
    if (tile.top < region.top) index.scrollTop += tile.top - region.top - 8;
    else if (tile.bottom > region.bottom) index.scrollTop += tile.bottom - region.bottom + 8;
  }

  function goToCase(active, behavior) {
    const top = cases[active].getBoundingClientRect().top - viewer.getBoundingClientRect().top + viewer.scrollTop;
    cases[active].firstElementChild.loading = 'eager';
    viewer.scrollTo({ top, behavior });
    markCase(active);
  }

  viewer.addEventListener('scroll', () => {
    let active = 0;
    const edge = viewer.getBoundingClientRect().top + 2;
    for (let index = 1; index < cases.length; index += 1) {
      if (cases[index].getBoundingClientRect().top > edge) break;
      active = index;
    }
    markCase(active);
  }, { passive: true });

  covers.forEach((cover, active) => {
    cover.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      if (location.hash !== projectUrl(projects[active])) history.pushState(null, '', projectUrl(projects[active]));
      document.title = `${projects[active].name} · 石燕燕作品集`;
      goToCase(active, 'instant');
    });
  });
  return goToCase;
}

let jumpToCase;

function renderRoute() {
  const hash = location.hash || '#home';
  const index = projects.findIndex(project => projectUrl(project) === hash);
  const wasDetail = !detail.hidden;
  mainHeader.hidden = index !== -1;

  for (const link of document.querySelectorAll('.bar nav a')) {
    if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }

  if (index === -1) {
    landing.hidden = false;
    detail.hidden = true;
    document.title = '石燕燕 · 2026UI设计作品集';
    const target = [...landing.children].find(section => `#${section.id}` === hash) || landing.firstElementChild;
    if (wasDetail) {
      const heading = target.querySelector('h1,h2');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    target.scrollIntoView({ behavior: wasDetail ? 'instant' : 'auto' });
    return;
  }

  const project = projects[index];
  if (!jumpToCase) jumpToCase = buildCaseViewer();
  landing.hidden = true;
  detail.hidden = false;
  document.title = `${project.name} · 石燕燕作品集`;
  window.scrollTo({ top: 0, behavior: 'instant' });
  jumpToCase(index, 'instant');
  if (!wasDetail) detail.querySelector('.detail-back').focus({ preventScroll: true });
}

const statement = document.querySelector('.statement');
const statementCopy = statement.querySelector('.statement-copy');
const preferStill = matchMedia('(prefers-reduced-motion: reduce)');
const capabilitySection = document.querySelector('#capabilities');
new IntersectionObserver(([entry]) => {
  capabilitySection.classList.toggle('in-view', entry.isIntersecting);
}).observe(capabilitySection);

const career = document.querySelector('#experience');
const careerEntries = [...career.querySelectorAll('.career-entry')];
const previousCareer = career.querySelector('.career-prev');
const nextCareer = career.querySelector('.career-next');
let careerIndex = 0;

function changeCareer(step) {
  const target = careerIndex + step;
  if (target < 0 || target > careerEntries.length - 2) return;
  careerIndex = target;
  careerEntries.forEach((entry, index) => {
    if (entry.getAnimations) entry.getAnimations().forEach(animation => animation.cancel());
    entry.hidden = index < target || index > target + 1;
    if (!entry.hidden && !preferStill.matches && entry.animate) {
      entry.animate([{ opacity: .1, translate: `${step * 24}px 0` }, { opacity: 1, translate: '0 0' }], {
        duration: 440, delay: (index - target) * 65, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards',
      });
    }
  });
  previousCareer.setAttribute('aria-disabled', String(target === 0));
  nextCareer.setAttribute('aria-disabled', String(target === careerEntries.length - 2));
}

previousCareer.addEventListener('click', () => changeCareer(-1));
nextCareer.addEventListener('click', () => changeCareer(1));
career.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  changeCareer(event.key === 'ArrowLeft' ? -1 : 1);
});

const statementLines = [...statementCopy.querySelectorAll('.statement-line')];
statementCopy.setAttribute('aria-label', statementLines.map(line => line.textContent).join(' '));
const characters = [];
function revealStatementText(content, container) {
  for (const token of content.match(/[A-Za-z0-9/]+|[^A-Za-z0-9/]/gu) || []) {
    if (/^\s$/u.test(token)) {
      container.append(token);
      continue;
    }
    const word = document.createElement('span');
    if (token.length > 1) word.className = 'statement-word';
    for (const character of token) {
      const glyph = document.createElement('span');
      glyph.className = 'statement-char';
      glyph.textContent = character;
      word.append(glyph);
      characters.push(glyph);
    }
    container.append(word);
  }
}
for (const line of statementLines) {
  const fragments = [...line.childNodes];
  line.replaceChildren();
  line.setAttribute('aria-hidden', 'true');
  for (const fragment of fragments) {
    if (fragment.nodeType === Node.ELEMENT_NODE) {
      const highlight = fragment.cloneNode(false);
      revealStatementText(fragment.textContent, highlight);
      line.append(highlight);
    } else {
      revealStatementText(fragment.textContent, line);
    }
  }
}
statement.classList.add('enhanced');

const designGallery = document.querySelector('#design-gallery');
const galleryRows = [...designGallery.querySelectorAll('.design-gallery-row')];

let queued = false;
function drawStatement() {
  queued = false;
  if (statement.closest('[hidden]')) return;
  const bounds = statement.getBoundingClientRect();
  const viewport = statement.firstElementChild.offsetHeight;
  const travel = Math.max(1, bounds.height - viewport);
  const progress = (viewport * .18 - bounds.top) / (travel * .83 + viewport * .18);
  const revealed = progress * (characters.length + 8);
  characters.forEach((glyph, index) => {
    const brightness = preferStill.matches ? 1 : .27 + .73 * Math.min(1, Math.max(0, (revealed - index) / 8));
    glyph.style.setProperty('--reveal', brightness);
  });
}

function scheduleStatement() {
  if (!queued) {
    queued = true;
    requestAnimationFrame(drawStatement);
  }
}

window.addEventListener('scroll', scheduleStatement, { passive: true });
window.addEventListener('resize', scheduleStatement);
window.watchPortfolioMedia(preferStill, scheduleStatement);

const galleryResizeObserver = new ResizeObserver(() => {
  for (const row of galleryRows) {
    const track = row.firstElementChild;
    const original = track.firstElementChild;
    const repeatWidth = original.getBoundingClientRect().width;
    if (!repeatWidth) continue;
    const copies = Math.max(2, Math.ceil(row.clientWidth / repeatWidth) + 1);
    while (track.children.length < copies) {
      const duplicate = original.cloneNode(true);
      duplicate.setAttribute('aria-hidden', 'true');
      track.append(duplicate);
    }
    while (track.children.length > copies) track.lastElementChild.remove();
    track.style.setProperty('--gallery-repeat', `${repeatWidth}px`);
    track.style.setProperty('--gallery-duration', `${repeatWidth / 46}s`);
  }
});

const galleryVisibilityObserver = new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.classList.toggle('in-view', entry.isIntersecting);
});

for (const row of galleryRows) {
  galleryResizeObserver.observe(row);
  galleryVisibilityObserver.observe(row);
}

const contact = document.querySelector('.contact-screen');
const contactControl = contact.querySelector('.contact-control');
const contactTrigger = contact.querySelector('.contact-trigger');
const contactPanel = contact.querySelector('.contact-qr-panel');
let contactPinned = false;
let contactHovered = false;

function updateContactPanel() {
  const open = contactPinned || contactHovered;
  contactTrigger.setAttribute('aria-expanded', String(open));
  contactPanel.hidden = !open;
}

function closeContactPanel() {
  contactPinned = false;
  contactHovered = false;
  updateContactPanel();
}

contactControl.addEventListener('pointerenter', event => {
  if (event.pointerType !== 'mouse') return;
  contactHovered = true;
  updateContactPanel();
});
contactControl.addEventListener('pointerleave', () => {
  contactHovered = false;
  updateContactPanel();
});
contactTrigger.addEventListener('click', () => {
  if (contactPinned) closeContactPanel();
  else {
    contactPinned = true;
    updateContactPanel();
  }
});
document.addEventListener('pointerdown', event => {
  if (!contactControl.contains(event.target)) closeContactPanel();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !contactPanel.hidden) closeContactPanel();
});

new IntersectionObserver(([entry]) => {
  contact.classList.toggle('in-view', entry.isIntersecting);
  if (!entry.isIntersecting) closeContactPanel();
}).observe(contact);


window.addEventListener('hashchange', () => {
  renderRoute();
  scheduleStatement();
});
if (performance.getEntriesByType('navigation')[0]?.type === 'reload' && location.hash !== '#home') {
  history.replaceState(history.state, '', '#home');
}
if (!location.hash || location.hash === '#home') window.scrollTo({ top: 0, behavior: 'instant' });
renderRoute();
scheduleStatement();
