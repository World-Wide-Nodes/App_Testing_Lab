// The badge dialog on a comparison page. The maker of a tested app clicks Badge and types the
// code from our message. The page compares the SHA-256 of the app's salt and the typed code,
// in capitals with everything but letters and digits taken out, with the hash the build put
// on the Badge link. Nothing is sent anywhere. On a match it shows the badge, offers it as SVG
// and PNG, and gives the HTML for a website. Without this script, or in a browser without
// <dialog>, the Badge link leads to the makers page, which says how to get a badge.
(function () {
  'use strict';
  var dialog = document.getElementById('badge-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  var form = dialog.querySelector('form.badge-code');
  var input = document.getElementById('badge-code-input');
  var current = null;
  var WRONG = 'That code does not match this app. Check the code in our message, ' +
    'or reply to it and we will send you a new one.';
  var NO_CHECK = 'This browser cannot check the code. Try another browser, ' +
    'or reply to our message and we will send you the badge.';
  var NO_PNG = 'The PNG could not be made in this browser. Download the SVG, ' +
    'or reply to our message and we will send you the PNG.';

  function part(name) { return dialog.querySelector('[data-fill="' + name + '"]'); }

  function step(name) {
    var steps = dialog.querySelectorAll('[data-step]');
    for (var i = 0; i < steps.length; i++) {
      steps[i].hidden = steps[i].getAttribute('data-step') !== name;
    }
  }

  function say(text) {
    var error = part('error');
    error.textContent = text;
    error.hidden = !text;
  }

  function normal(code) { return String(code).toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  function hex(buffer) {
    var bytes = new Uint8Array(buffer);
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
    return out;
  }

  function digest(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(hex);
  }

  function attr(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function snippet() {
    return '<a href="' + attr(current.page) + '"><img src="' + attr(current.image) +
      '" alt="' + attr(current.alt) + '"></a>';
  }

  function fileName(ext) { return current.key + '-proofbench-badge.' + ext; }

  function save(blob, name) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function png() {
    var image = new Image();
    image.onload = function () {
      var scale = 4;                       // sharp on high-density screens and in listings
      var canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth * scale;
      canvas.height = image.naturalHeight * scale;
      try {
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (blob) save(blob, fileName('png'));
          else part('copied').textContent = NO_PNG;
        }, 'image/png');
      } catch (problem) {
        part('copied').textContent = NO_PNG;
      }
    };
    image.onerror = function () { part('copied').textContent = NO_PNG; };
    image.src = current.svg;
  }

  function copy() {
    var area = part('html');
    var done = function () { part('copied').textContent = 'Copied.'; };
    var byHand = function () {
      area.focus();
      area.select();
      try {
        if (document.execCommand('copy')) done();
      } catch (problem) { /* the code stays selected for the maker to copy */ }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(area.value).then(done, byHand);
    } else {
      byHand();
    }
  }

  function open(link) {
    current = link.dataset;
    part('name').textContent = current.name;
    part('copied').textContent = '';
    input.value = '';
    say('');
    step(current.hash ? 'ask' : 'none');
    dialog.showModal();
    if (current.hash) input.focus();
  }

  function show() {
    var file = part('svg-file');
    file.href = current.svg;
    file.setAttribute('download', fileName('svg'));
    var preview = part('preview');
    preview.src = current.svg;
    preview.alt = current.alt;
    part('html').value = snippet();
    step('got');
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a.badge-open');
    if (!link) return;
    event.preventDefault();
    open(link);
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) { dialog.close(); return; }   // a click on the backdrop
    var button = event.target.closest('[data-action]');
    if (!button) return;
    var action = button.getAttribute('data-action');
    if (action === 'close') dialog.close();
    else if (action === 'png') png();
    else if (action === 'copy') copy();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    say('');
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) { say(NO_CHECK); return; }
    digest(current.salt + normal(input.value)).then(function (found) {
      if (found === current.hash) { show(); return; }
      say(WRONG);
      input.select();
    }, function () { say(NO_CHECK); });
  });
})();
