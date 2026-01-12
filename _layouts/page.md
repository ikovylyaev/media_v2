---
layout: default
---
<div class='container'>
<header class="site-header px-0">
  <div class="header-inner">
    <div class="logo">
      <a href="/" class="navbar-brand">
        <img src="{{ site.url }}/img/media_dark.svg" style="height: 48px;">
      </a>
    </div>
    <nav class="main-nav">
      <ul>
        <li><a href="/" class="nav-link">карта</a></li>
        <li><a href="/photo" class="nav-link">фото</a></li>
        <li><a href="/video" class="nav-link active">видео</a></li>
      </ul>
    </nav>
  </div>
</header>

<div style="font-family: 'Cormorant', serif; font-size: 1em;">
	<h2 class='h1'>{{ page.title }}</h2>
	{{ content }}
</div>
<footer class='px-0'>
  <div class="logo">
    <a href="/" class="navbar-brand">
      <img src="{{ site.url }}/img/media_dark.svg" style="height: 32px;">
    </a>
  </div>
  <nav class="footer-nav">
    <ul>
      <li><a href="http://ikovylyaev.com" class="nav-link active">дизайн: ikovylyaev</a></li>
      <li><a href="{{site.url}}/terms" class="nav-link">правила использования</a></li>
      <li><a href="{{site.url}}/privacy" class="nav-link">политика конфиденциальности</a></li>
    </ul>
  </nav>
</footer>

</div>