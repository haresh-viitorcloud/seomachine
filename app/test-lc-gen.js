require('dotenv').config();
const { initializeDatabase, db } = require('./src/config/database');
initializeDatabase();
const claude = require('./src/services/claudeService');

const blog = db.prepare("SELECT * FROM blog_configs WHERE slug='lc'").get();
console.log('Engine    :', claude.getGenerationMode ? '(native pipeline)' : 'native');
console.log('Blog      :', blog.name);
console.log('Context   :', blog.context_path);
console.log('Rules     :', blog.rules_path);
console.log('---');

const row = {
  title: 'Laravel AI Code Generator: Build Full-Stack Apps Faster',
  primary_keyword: 'Laravel AI code generator',
  secondary_keywords: ['AI code generation for Laravel', 'Laravel AI assistant', 'build Laravel apps with AI'],
  theme: 'AI-assisted Laravel development',
  blog_type: 'how-to / product-led',
  icp: 'Laravel developers and technical founders building full-stack apps',
  pain_points: 'boilerplate fatigue, generic AI tools that ignore Laravel conventions, slow MVP delivery',
};

(async () => {
  const t0 = Date.now();
  try {
    const res = await claude.generateBlogContent(
      row, blog.context_path, blog.rules_path,
      (m) => console.log('  >', m),
      false, [], '', blog
    );
    const secs = Math.round((Date.now() - t0) / 1000);
    const content = res.content || '';
    const words = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const laravelTerms = ['Laravel', 'Eloquent', 'Artisan', 'Blade', 'Livewire', 'Filament', 'migration', 'Forge', 'Ploi'];
    const hits = laravelTerms.filter(t => new RegExp(t, 'i').test(content));
    console.log('\n================ RESULT (' + secs + 's) ================');
    console.log('title       :', res.title);
    console.log('seo_title   :', res.seo_title);
    console.log('slug        :', res.slug);
    console.log('meta_desc   :', res.meta_description, '(' + (res.meta_description || '').length + ' chars)');
    console.log('word count  :', words);
    console.log('tags        :', (res.tags || []).join(', '));
    console.log('faq count   :', (res.faq || []).length);
    console.log('Laravel ctx :', hits.join(', ') || 'NONE (context did not flow!)');
    console.log('cost(usd)   :', res._costUsd);
    console.log('\n--- content preview (first 700 chars, tags stripped) ---');
    console.log(content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 700) + ' …');
    console.log('\nDONE');
  } catch (e) {
    console.error('\nGENERATION ERROR:', e.message);
    process.exitCode = 1;
  }
})();
