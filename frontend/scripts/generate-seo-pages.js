import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = join(root, 'dist')
const template = await readFile(join(dist, 'index.html'), 'utf8')
const pages = JSON.parse(await readFile(join(root, 'seo-pages.json'), 'utf8'))
const escapeHtml = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

for (const page of pages) {
  const url = `https://www.wabwireglobalinnovations.com${page.path === '/' ? '/' : page.path}`
  const faqSchema = page.path === '/services/web-development' ? `<script type="application/ld+json">${JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Custom software, web and mobile app development',
      serviceType: ['Custom software development', 'Web development', 'Mobile app development', 'POS and management systems', 'AI integrations'],
      provider: { '@id': 'https://www.wabwireglobalinnovations.com/#organization' },
      areaServed: { '@type': 'Country', name: 'Kenya' },
      url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
      ['How much does custom software development cost in Kenya?', 'Cost depends on the features, integrations, design and delivery scope. Our guide rates are shown on this page; after a discovery discussion, we can prepare a project-specific quotation.'],
      ['Can you build software around our existing business process?', 'Yes. We begin by understanding the current workflow and what needs to improve, then agree on the requirements and the right digital solution.'],
      ['Do you provide support after launch?', 'Post-launch maintenance and improvements can be discussed as part of the project scope or through ongoing support arrangements.'],
      ['How do we start a software project?', 'Contact our team with a short description of the problem, who will use the product and what you need it to do. We will arrange a discussion about the next steps.'],
      ].map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
    },
  ])}</script>` : ''
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*"\s*\/>/, `<meta name="robots" content="${page.index ? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' : 'noindex, follow'}" />`)
    .replace(/<meta name="googlebot" content="[^"]*"\s*\/>/, `<meta name="googlebot" content="${page.index ? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' : 'noindex, follow'}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:image:alt" content="[^"]*"\s*\/>/, '<meta property="og:image:alt" content="Wabwire Global Innovations company logo" />')
    .replace(/<meta name="twitter:image" content="[^"]*"\s*\/>/, '<meta name="twitter:image" content="https://www.wabwireglobalinnovations.com/images/brand/logo-lockup.jpg" />')
    .replace(/<meta name="twitter:image:alt" content="[^"]*"\s*\/>/, '<meta name="twitter:image:alt" content="Wabwire Global Innovations company logo" />')
    .replace('</body>', `${faqSchema}</body>`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`)
  const target = page.path === '/' ? join(dist, 'index.html') : join(dist, page.path.slice(1), 'index.html')
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, html)
}
