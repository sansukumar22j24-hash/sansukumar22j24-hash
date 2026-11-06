const fs = require('node:fs');
const path = require('node:path');

const username = process.env.GITHUB_USERNAME;
const token = process.env.GITHUB_TOKEN;
const outputDir = process.env.OUTPUT_DIR || 'dist';

if (!username || !token) {
  throw new Error('GITHUB_USERNAME and GITHUB_TOKEN are required.');
}

const query = [
  'query($login: String!, $from: DateTime!, $to: DateTime!) {',
  '  user(login: $login) {',
  '    contributionsCollection(from: $from, to: $to) {',
  '      contributionCalendar {',
  '        totalContributions',
  '        weeks { contributionDays { date contributionCount contributionLevel } }',
  '      }',
  '    }',
  '  }',
  '}'
].join('\n');

function esc(value) {
  return String(value).replace(/[&<>"']/g, function (char) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char];
  });
}

function padWeeks(weeks) {
  const normalized = weeks.slice(-53);
  while (normalized.length < 53) {
    normalized.unshift({ contributionDays: [] });
  }
  return normalized;
}

function buildSvg(calendar, theme) {
  const dark = theme === 'dark';
  const palette = dark
    ? ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
    : ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

  const levelIndex = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4
  };

  const weeks = padWeeks(calendar.weeks || []);
  const cells = [];

  weeks.forEach(function (week, weekIndex) {
    const days = week.contributionDays || [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = days[dayIndex];
      const level = day ? (levelIndex[day.contributionLevel] ?? 0) : 0;
      const x = 22 + weekIndex * 15;
      const y = 126 + dayIndex * 15;
      const date = day ? esc(day.date) : 'No contribution data';
      const count = day ? Number(day.contributionCount || 0) : 0;
      cells.push(
        '<rect x="' + x + '" y="' + y + '" width="11" height="11" rx="3" fill="' + palette[level] + '">' +
        '<title>' + date + ': ' + count + (count === 1 ? ' contribution' : ' contributions') + '</title></rect>'
      );
    }
  });

  const background = dark ? '#0d1117' : '#ffffff';
  const label = dark ? '#c9d1d9' : '#57606a';
  const muted = dark ? '#8b949e' : '#6e7781';
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="840" height="250" viewBox="0 0 840 250" role="img" aria-labelledby="title desc">',
    '<title id="title">' + esc(username) + ' GitHub contribution dragon</title>',
    '<desc id="desc">A purple and cyan dragon flies above a calendar heatmap of GitHub contributions.</desc>',
    '<defs>',
    '  <linearGradient id="dragonBody" x1="0" y1="0" x2="1" y2="1">',
    '    <stop offset="0%" stop-color="#a78bfa"/>',
    '    <stop offset="55%" stop-color="#8b5cf6"/>',
    '    <stop offset="100%" stop-color="#22d3ee"/>',
    '  </linearGradient>',
    '  <linearGradient id="dragonWing" x1="0" y1="0" x2="1" y2="1">',
    '    <stop offset="0%" stop-color="#c4b5fd" stop-opacity=".96"/>',
    '    <stop offset="100%" stop-color="#06b6d4" stop-opacity=".78"/>',
    '  </linearGradient>',
    '  <linearGradient id="flame" x1="0" y1="0" x2="1" y2="0">',
    '    <stop offset="0%" stop-color="#f97316"/>',
    '    <stop offset="100%" stop-color="#facc15"/>',
    '  </linearGradient>',
    '  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">',
    '    <feGaussianBlur stdDeviation="3" result="blur"/>',
    '    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>',
    '  </filter>',
    '</defs>',
    '<rect width="840" height="250" rx="14" fill="' + background + '" fill-opacity=".15"/>',
    '<text x="22" y="22" fill="' + label + '" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="2">CONTRIBUTION DRAGON</text>',
    '<text x="818" y="22" text-anchor="end" fill="' + muted + '" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10">' + esc(username) + '</text>',
    '<g opacity=".9">' + cells.join('') + '</g>',
    '<g fill="none" stroke="#a78bfa" stroke-width="1.2" opacity=".65">',
    '  <path d="M42 88 l3 -7 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3z"/>',
    '  <path d="M756 66 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2z"/>',
    '  <path d="M684 105 l2 -4 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2z"/>',
    '</g>',
    '<g transform="translate(-120 63)">',
    '  <animateTransform attributeName="transform" type="translate" from="-120 63" to="960 63" dur="18s" repeatCount="indefinite"/>',
    '  <g transform="scale(.72)">',
    '    <path d="M-42 15 C-61 12 -75 1 -93 -12 C-88 9 -80 25 -61 31 C-78 34 -90 44 -98 58 C-72 52 -53 42 -34 29" fill="url(#dragonBody)" stroke="#312e81" stroke-width="3" stroke-linejoin="round"/>',
    '    <path d="M-48 15 C-28 -7 2 -9 26 5 C40 13 47 17 59 10 C48 28 24 38 -5 34 C-27 32 -42 26 -48 15Z" fill="url(#dragonBody)" stroke="#312e81" stroke-width="3"/>',
    '    <path d="M-23 28 C-8 35 15 35 34 24 L26 40 C8 48 -11 44 -23 28Z" fill="#312e81" opacity=".45"/>',
    '    <path d="M-16 0 l8 -15 l7 15 l7 -17 l7 18 l8 -14 l6 19" fill="#c4b5fd" stroke="#312e81" stroke-width="2" stroke-linejoin="round"/>',
    '    <g transform="rotate(-8 0 8)">',
    '      <path d="M-5 8 C-17 -1 -29 -24 -53 -48 C-47 -22 -37 -4 -22 14 C-12 23 -1 20 7 11Z" fill="url(#dragonWing)" stroke="#312e81" stroke-width="3" stroke-linejoin="round"/>',
    '      <path d="M-43 -34 L-23 12 M-31 -20 L-17 12" fill="none" stroke="#6d5bd0" stroke-width="2" opacity=".8"/>',
    '      <animateTransform attributeName="transform" type="rotate" values="-12 0 8;24 0 8;-12 0 8" dur="1.1s" repeatCount="indefinite"/>',
    '    </g>',
    '    <g transform="rotate(8 14 8)">',
    '      <path d="M10 10 C13 -9 25 -28 47 -39 C42 -14 31 3 20 17Z" fill="url(#dragonWing)" stroke="#312e81" stroke-width="3" stroke-linejoin="round"/>',
    '      <path d="M40 -28 L20 15 M30 -16 L18 13" fill="none" stroke="#6d5bd0" stroke-width="2" opacity=".8"/>',
    '      <animateTransform attributeName="transform" type="rotate" values="10 14 8;-22 14 8;10 14 8" dur="1.1s" repeatCount="indefinite"/>',
    '    </g>',
    '    <path d="M31 13 C38 -1 40 -16 55 -22 L73 -24 L85 -15 L75 -8 L91 -1 L78 7 L58 3 L43 22Z" fill="url(#dragonBody)" stroke="#312e81" stroke-width="3" stroke-linejoin="round"/>',
    '    <path d="M54 -20 Q48 -34 39 -36 Q44 -24 47 -17 M66 -22 Q68 -35 79 -39 Q75 -26 73 -19" fill="#c4b5fd" stroke="#312e81" stroke-width="2" stroke-linejoin="round"/>',
    '    <ellipse cx="70" cy="-12" rx="3.2" ry="4" fill="#facc15"/>',
    '    <circle cx="71" cy="-12" r="1.3" fill="#111827"/>',
    '    <path d="M79 2 Q86 4 90 1" fill="none" stroke="#312e81" stroke-width="2" stroke-linecap="round"/>',
    '    <path d="M-24 29 Q-25 43 -39 46 L-48 44 M15 31 Q17 43 8 48 L-1 47 M37 19 Q44 30 36 39 L29 40" fill="none" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>',
    '    <path d="M89 -1 Q103 -4 111 1 Q104 4 94 3Z" fill="url(#flame)" filter="url(#glow)">',
    '      <animate attributeName="opacity" values=".25;1;.4" dur=".45s" repeatCount="indefinite"/>',
    '    </path>',
    '  </g>',
    '</g>',
    '<text x="22" y="242" fill="' + muted + '" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9">LESS</text>',
    '<g transform="translate(53 233)">',
    '  <rect width="9" height="9" rx="2" fill="' + palette[0] + '"/>',
    '  <rect x="13" width="9" height="9" rx="2" fill="' + palette[1] + '"/>',
    '  <rect x="26" width="9" height="9" rx="2" fill="' + palette[2] + '"/>',
    '  <rect x="39" width="9" height="9" rx="2" fill="' + palette[3] + '"/>',
    '  <rect x="52" width="9" height="9" rx="2" fill="' + palette[4] + '"/>',
    '</g>',
    '<text x="122" y="242" fill="' + muted + '" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9">MORE</text>',
    '<text x="818" y="242" text-anchor="end" fill="' + muted + '" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9">' + Number(calendar.totalContributions || 0) + ' contributions in the displayed period</text>',
    '</svg>'
  ].join('\n');

  return svg;
}

async function main() {
  const now = new Date();
  const from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'User-Agent': 'contribution-dragon-generator'
    },
    body: JSON.stringify({
      query: query,
      variables: {
        login: username,
        from: from.toISOString(),
        to: now.toISOString()
      }
    })
  });

  const payload = await response.json();
  if (!response.ok || payload.errors || !payload.data || !payload.data.user) {
    throw new Error('GitHub GraphQL request failed: ' + JSON.stringify(payload.errors || payload));
  }

  const calendar = payload.data.user.contributionsCollection.contributionCalendar;
  fs.mkdirSync(outputDir, { recursive: true });

  const lightPath = path.join(outputDir, 'github-contribution-dragon.svg');
  const darkPath = path.join(outputDir, 'github-contribution-dragon-dark.svg');

  fs.writeFileSync(lightPath, buildSvg(calendar, 'light'), 'utf8');
  fs.writeFileSync(darkPath, buildSvg(calendar, 'dark'), 'utf8');

  console.log('Generated contribution dragon SVGs for ' + username + '.');
  console.log('Total contributions in period: ' + calendar.totalContributions);
  console.log('Files: ' + lightPath + ', ' + darkPath);
}

main().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
