/**
 * Email Templates — The PickleHub Notification System
 *
 * Provides responsive, cross-client HTML and plain-text templates
 * adhering to The PickleHub's visual brand identity.
 *
 * Security: All dynamic or user-supplied strings are strictly HTML-escaped
 * before insertion into templates to prevent XSS or markup injection.
 *
 * @module services/emailTemplates
 */

/**
 * Escapes unsafe HTML characters in user-supplied strings.
 *
 * @param {string|number|null|undefined} str - Unescaped value
 * @returns {string} Safe HTML-encoded string
 */
const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Base layout wrapper providing consistent PickleHub styling.
 *
 * @param {object} params
 * @param {string} params.title - Page title for header
 * @param {string} params.preheader - Preview text for inbox listing
 * @param {string} params.contentHtml - Inner body content HTML
 * @param {string} params.clientUrl - Web app URL
 * @returns {string} Complete HTML document string
 */
const wrapInBaseLayout = ({ title, preheader, contentHtml, clientUrl }) => {
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader);
  const appUrl = escapeHtml(clientUrl || 'https://picklehub.app');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #140f02;
      color: #ede1c9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    a { color: #10b981; text-decoration: none; }
    .button {
      display: inline-block;
      padding: 12px 28px;
      background-color: #ff3b3f;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: 8px;
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #140f02; color: #ede1c9;">
  <!-- Hidden Preheader Preview Text -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${safePreheader}
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #251f10; border: 1px solid #3b3423; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #3b3423; background: linear-gradient(180deg, #2f2715 0%, #251f10 100%);">
              <div style="display: inline-block; width: 44px; height: 44px; border-radius: 50%; background-color: #ff3b3f; color: #ffffff; font-family: Georgia, serif; font-size: 24px; font-weight: bold; line-height: 44px; text-align: center; margin-bottom: 8px;">
                P
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #ede1c9;">
                THE PICKLEHUB
              </h1>
              <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #a89a80;">
                Competitive Sports-Tech Platform
              </p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #1c1608; border-top: 1px solid #3b3423; text-align: center; font-size: 12px; color: #8c8068; line-height: 1.6;">
              <p style="margin: 0 0 8px;">
                You received this transactional notification regarding your account on <a href="${appUrl}" style="color: #ede1c9; font-weight: 600;">The PickleHub</a>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #706652;">
                Manage your preferences in your athlete dashboard settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Generates Welcome Email (HTML & Plain-Text).
 *
 * @param {object} params
 * @param {string} params.name - User/Player Name
 * @param {string} params.email - Recipient Email
 * @param {string} [params.playerId] - Unique Player ID (e.g. PH-00001)
 * @param {string} params.clientUrl - Base client URL
 * @returns {{ subject: string, html: string, text: string }}
 */
const renderWelcomeEmail = ({ name, email, playerId, clientUrl }) => {
  const safeName = escapeHtml(name || email?.split('@')[0] || 'Athlete');
  const safePlayerId = escapeHtml(playerId || 'Pending');
  const safeClientUrl = clientUrl || 'https://picklehub.app';
  const dashboardUrl = `${safeClientUrl}/dashboard`;

  const subject = 'Welcome to The PickleHub — Official Registration Confirmed';
  const preheader = `Welcome, ${safeName}! Your official PickleHub athlete account is ready.`;

  const contentHtml = `
    <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #ede1c9;">
      Welcome to the Court, ${safeName}!
    </h2>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #d6cab2;">
      Your account on <strong>The PickleHub</strong> is officially active. You now have access to our verified Elo rating ladder, instant courtside match recording, and tournament participation.
    </p>

    <!-- Athlete Passport Card -->
    <table role="presentation" width="100%" style="margin: 24px 0; background-color: #1a1406; border: 1px solid #3b3423; border-radius: 12px; padding: 20px;" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 16px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #a89a80; padding-bottom: 4px;">
                Official Player ID
              </td>
              <td align="right" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #a89a80; padding-bottom: 4px;">
                Initial Rating
              </td>
            </tr>
            <tr>
              <td style="font-size: 18px; font-weight: 700; font-family: monospace; color: #ff3b3f;">
                ${safePlayerId}
              </td>
              <td align="right" style="font-size: 18px; font-weight: 700; color: #10b981;">
                1000 Elo (Beginner)
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #a89a80;">
      Share your Player ID courtside or have opponents scan your personal QR code to log official matches. Every approved victory advances your rating toward Intermediate, Advanced, and Elite categories.
    </p>

    <!-- Action Button -->
    <div style="text-align: center; margin: 32px 0 16px;">
      <a href="${dashboardUrl}" class="button" style="display: inline-block; padding: 14px 32px; background-color: #ff3b3f; color: #ffffff !important; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; text-transform: uppercase;">
        Go to Athlete Dashboard &rarr;
      </a>
    </div>
  `;

  const html = wrapInBaseLayout({
    title: subject,
    preheader,
    contentHtml,
    clientUrl,
  });

  const text = `WELCOME TO THE PICKLEHUB
===================================
Hello ${name || 'Athlete'},

Your official athlete account on The PickleHub is confirmed!

Account Details:
- Official Player ID: ${playerId || 'Assigned in Dashboard'}
- Starting Rating: 1000 Elo (Beginner)
- Registered Email: ${email}

Log in to track your matches, view the leaderboard, and challenge club members:
${dashboardUrl}

The PickleHub — Competitive Pickleball Sports-Tech Platform`;

  return { subject, html, text };
};

/**
 * Formats a list of players into a comma-separated readable string.
 *
 * @param {Array<object>} players - Player objects
 * @returns {string} Safe HTML string
 */
const formatPlayerNamesHtml = (players) => {
  if (!Array.isArray(players) || players.length === 0) return 'Unknown';
  return players
    .map((p) => escapeHtml(p.name || p.playerId || 'Player'))
    .join(', ');
};

/**
 * Formats scores array into readable string (e.g. "11-8, 11-9").
 *
 * @param {Array<object>} scores - Game scores
 * @returns {string} Formatted scores string
 */
const formatScoresString = (scores) => {
  if (!Array.isArray(scores) || scores.length === 0) return 'N/A';
  return scores
    .map((s) => `${s.teamAScore}-${s.teamBScore}`)
    .join(', ');
};

/**
 * Generates Official Match-Result Email (HTML & Plain-Text).
 *
 * @param {object} params
 * @param {string} params.recipientName - Player's Name
 * @param {string} params.recipientPlayerId - Player ID (PH-XXXXX)
 * @param {object} params.match - Populated match document
 * @param {object} params.personalOutcome - { isWinner, oldRating, newRating, delta, category, tournamentBonus }
 * @param {string} params.clientUrl - Base client URL
 * @returns {{ subject: string, html: string, text: string }}
 */
const renderMatchResultEmail = ({
  recipientName,
  recipientPlayerId,
  match,
  personalOutcome,
  clientUrl,
}) => {
  const safeName = escapeHtml(recipientName || 'Athlete');
  const safeMatchId = escapeHtml(match.matchId || String(match._id));
  const safeCourt = escapeHtml(match.court || 'Court 1');
  const safeMatchType = escapeHtml(match.matchType || 'SINGLES');
  const safeScores = escapeHtml(formatScoresString(match.scores));

  const teamANames = formatPlayerNamesHtml(match.teamA);
  const teamBNames = formatPlayerNamesHtml(match.teamB);

  const isWinner = !!personalOutcome?.isWinner;
  const oldRating = personalOutcome?.oldRating ?? 1000;
  const newRating = personalOutcome?.newRating ?? 1000;
  const delta = personalOutcome?.delta ?? 0;
  const tournamentBonus = personalOutcome?.tournamentBonus || 0;
  const currentCategory = escapeHtml(personalOutcome?.category || 'Beginner');

  const deltaSign = delta > 0 ? `+${delta}` : `${delta}`;
  const deltaColor = delta >= 0 ? '#10b981' : '#ff5451';
  const outcomeBadge = isWinner ? 'VICTORY' : 'MATCH COMPLETE';
  const outcomeBadgeBg = isWinner ? '#064e3b' : '#372e18';
  const outcomeBadgeColor = isWinner ? '#34d399' : '#d6cab2';

  const matchDate = match.date
    ? new Date(match.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  const subject = `Official Match Result: ${match.matchType} on ${match.court} (${deltaSign} Elo)`;
  const preheader = `Your official match ${safeMatchId} has been verified: ${deltaSign} Elo rating update.`;
  const profileUrl = `${clientUrl || 'https://picklehub.app'}/profile/${recipientPlayerId || ''}`;

  const bonusHtml = tournamentBonus > 0
    ? `<tr>
         <td style="font-size: 13px; color: #a89a80; padding: 6px 0;">Tournament Bonus:</td>
         <td align="right" style="font-size: 13px; font-weight: 700; color: #fbbf24; padding: 6px 0;">+${tournamentBonus} Elo</td>
       </tr>`
    : '';

  const contentHtml = `
    <!-- Result Header Pill -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; padding: 6px 16px; background-color: ${outcomeBadgeBg}; color: ${outcomeBadgeColor}; font-weight: 800; font-size: 12px; letter-spacing: 0.15em; border-radius: 9999px; text-transform: uppercase;">
        ${outcomeBadge}
      </span>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; text-align: center; color: #ede1c9;">
      Match Verified & Ratings Updated
    </h2>
    <p style="margin: 0 0 24px; font-size: 14px; text-align: center; color: #a89a80;">
      ${matchDate} &bull; ${safeCourt} &bull; ${safeMatchType}
    </p>

    <!-- Personal Rating Delta Box -->
    <table role="presentation" width="100%" style="margin: 0 0 24px; background-color: #1a1406; border: 1px solid #3b3423; border-radius: 12px; padding: 20px;" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 18px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #a89a80; padding-bottom: 8px;">
                Athlete: <strong>${safeName}</strong>
              </td>
              <td align="right" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #a89a80; padding-bottom: 8px;">
                Tier: <strong>${currentCategory}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-top: 1px solid #2d2614;">
                <span style="font-size: 13px; color: #a89a80;">Previous Rating:</span>
                <span style="font-size: 14px; font-weight: 600; color: #ede1c9; margin-left: 8px;">${oldRating} Elo</span>
              </td>
              <td align="right" style="padding: 8px 0; border-top: 1px solid #2d2614;">
                <span style="font-size: 18px; font-weight: 800; color: ${deltaColor};">
                  ${deltaSign} Elo
                </span>
              </td>
            </tr>
            ${bonusHtml}
            <tr>
              <td style="padding-top: 8px; border-top: 1px solid #2d2614; font-size: 14px; font-weight: 700; color: #ede1c9;">
                Updated Rating:
              </td>
              <td align="right" style="padding-top: 8px; border-top: 1px solid #2d2614; font-size: 20px; font-weight: 800; color: #10b981;">
                ${newRating} Elo
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Match Summary Table -->
    <table role="presentation" width="100%" style="margin-bottom: 28px; background-color: #1c1608; border: 1px solid #3b3423; border-radius: 12px;" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #2d2614;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #8c8068;">
            Match ID: ${safeMatchId}
          </span>
        </td>
        <td align="right" style="padding: 16px 20px; border-bottom: 1px solid #2d2614;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #10b981; font-weight: 700;">
            Scores: ${safeScores}
          </span>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 16px 20px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td width="45%" style="vertical-align: top;">
                <div style="font-size: 12px; font-weight: 700; color: ${match.winnerTeam === 'A' ? '#10b981' : '#ede1c9'};">
                  ${match.winnerTeam === 'A' ? '🏆 ' : ''}Team A
                </div>
                <div style="font-size: 13px; color: #a89a80; margin-top: 2px;">
                  ${teamANames}
                </div>
              </td>
              <td width="10%" align="center" style="font-size: 12px; font-weight: 700; color: #706652;">
                VS
              </td>
              <td width="45%" align="right" style="vertical-align: top;">
                <div style="font-size: 12px; font-weight: 700; color: ${match.winnerTeam === 'B' ? '#10b981' : '#ede1c9'};">
                  ${match.winnerTeam === 'B' ? '🏆 ' : ''}Team B
                </div>
                <div style="font-size: 13px; color: #a89a80; margin-top: 2px;">
                  ${teamBNames}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Call to Action -->
    <div style="text-align: center; margin: 32px 0 12px;">
      <a href="${profileUrl}" class="button" style="display: inline-block; padding: 14px 32px; background-color: #ff3b3f; color: #ffffff !important; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; text-transform: uppercase;">
        View Rating History &rarr;
      </a>
    </div>
  `;

  const html = wrapInBaseLayout({
    title: subject,
    preheader,
    contentHtml,
    clientUrl,
  });

  const text = `OFFICIAL MATCH RESULT — THE PICKLEHUB
===================================
Match ID: ${match.matchId || match._id}
Date: ${matchDate}
Court: ${match.court} (${match.matchType})
Scores: ${formatScoresString(match.scores)}
Winner: Team ${match.winnerTeam}

PARTICIPANTS:
Team A: ${match.teamA?.map((p) => p.name || p.playerId).join(', ')}
Team B: ${match.teamB?.map((p) => p.name || p.playerId).join(', ')}

RATING OUTCOME FOR ${recipientName.toUpperCase()}:
- Previous Rating: ${oldRating} Elo
- Rating Delta: ${deltaSign} Elo
- Updated Rating: ${newRating} Elo (${personalOutcome?.category || 'Beginner'})
${tournamentBonus > 0 ? `- Tournament Bonus: +${tournamentBonus} Elo\n` : ''}
View your rating trajectory:
${profileUrl}

The PickleHub — Competitive Pickleball Sports-Tech Platform`;

  return { subject, html, text };
};

module.exports = {
  escapeHtml,
  renderWelcomeEmail,
  renderMatchResultEmail,
  renderLoginAlertEmail,
  renderAccountLockedEmail,
  renderRatingMilestoneEmail,
  renderMatchRejectedEmail,
};

/**
 * Generates Login Alert Email (HTML & Plain-Text).
 *
 * @param {object} params
 * @param {string} params.name - User/Player Name
 * @param {string} params.email - Account Email
 * @param {string} [params.ipAddress] - Request IP address
 * @param {string} [params.userAgent] - Browser user-agent string
 * @param {Date} [params.loginTime] - Login timestamp
 * @param {string} params.clientUrl - Base client URL
 * @returns {{ subject: string, html: string, text: string }}
 */
function renderLoginAlertEmail({ name, email, ipAddress, userAgent, loginTime, clientUrl }) {
  const safeName = escapeHtml(name || email?.split('@')[0] || 'Athlete');
  const safeEmail = escapeHtml(email);
  const safeIp = escapeHtml(ipAddress || 'Unknown');
  const safeAgent = escapeHtml(
    userAgent
      ? userAgent.length > 80
        ? userAgent.substring(0, 80) + '…'
        : userAgent
      : 'Unknown Browser'
  );
  const timeStr = loginTime
    ? new Date(loginTime).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const subject = 'Security Alert: New Sign-In to Your PickleHub Account';
  const preheader = `New login detected on your account at ${timeStr}.`;

  const contentHtml = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; padding: 6px 16px; background-color: #1a3a5c; color: #60a5fa; font-weight: 800; font-size: 12px; letter-spacing: 0.15em; border-radius: 9999px; text-transform: uppercase;">
        SECURITY ALERT
      </span>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; text-align: center; color: #ede1c9;">
      New Sign-In Detected
    </h2>
    <p style="margin: 0 0 24px; font-size: 14px; text-align: center; color: #a89a80;">
      Hello ${safeName}, we noticed a new sign-in to your account.
    </p>

    <!-- Login Details Card -->
    <table role="presentation" width="100%" style="margin: 0 0 24px; background-color: #1a1406; border: 1px solid #3b3423; border-radius: 12px;" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 18px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0;">Account:</td>
              <td align="right" style="font-size: 13px; font-weight: 600; color: #ede1c9; padding: 6px 0;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0; border-top: 1px solid #2d2614;">Time:</td>
              <td align="right" style="font-size: 13px; font-weight: 600; color: #ede1c9; padding: 6px 0; border-top: 1px solid #2d2614;">${escapeHtml(timeStr)}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0; border-top: 1px solid #2d2614;">IP Address:</td>
              <td align="right" style="font-size: 13px; font-weight: 600; color: #ede1c9; padding: 6px 0; border-top: 1px solid #2d2614;">${safeIp}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0; border-top: 1px solid #2d2614;">Device:</td>
              <td align="right" style="font-size: 13px; font-weight: 600; color: #ede1c9; padding: 6px 0; border-top: 1px solid #2d2614; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${safeAgent}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #a89a80;">
      If this was you, no action is needed. If you don't recognize this activity, please change your password immediately to secure your account.
    </p>

    <div style="text-align: center; margin: 32px 0 12px;">
      <a href="${clientUrl || 'https://picklehub.app'}/dashboard" class="button" style="display: inline-block; padding: 14px 32px; background-color: #ff3b3f; color: #ffffff !important; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; text-transform: uppercase;">
        Review Account &rarr;
      </a>
    </div>
  `;

  const html = wrapInBaseLayout({ title: subject, preheader, contentHtml, clientUrl });

  const text = `SECURITY ALERT — THE PICKLEHUB
===================================
New Sign-In Detected

Hello ${name || 'Athlete'},

A new sign-in was detected on your PickleHub account.

Account: ${email}
Time: ${timeStr}
IP Address: ${ipAddress || 'Unknown'}
Device: ${userAgent ? userAgent.substring(0, 80) : 'Unknown'}

If this was you, no action is needed.
If you don't recognize this activity, change your password immediately.

The PickleHub — Competitive Pickleball Sports-Tech Platform`;

  return { subject, html, text };
}

/**
 * Generates Account Locked Email (HTML & Plain-Text).
 *
 * @param {object} params
 * @param {string} params.name - User/Player Name
 * @param {string} params.email - Account Email
 * @param {number} params.lockoutMinutes - Duration of lockout in minutes
 * @param {string} [params.ipAddress] - IP of the last failed attempt
 * @param {string} params.clientUrl - Base client URL
 * @returns {{ subject: string, html: string, text: string }}
 */
function renderAccountLockedEmail({ name, email, lockoutMinutes, ipAddress, clientUrl }) {
  const safeName = escapeHtml(name || email?.split('@')[0] || 'Athlete');
  const safeEmail = escapeHtml(email);
  const safeIp = escapeHtml(ipAddress || 'Unknown');
  const lockMins = lockoutMinutes || 15;

  const subject = '⚠️ Account Locked — Too Many Failed Login Attempts';
  const preheader = `Your PickleHub account has been temporarily locked for ${lockMins} minutes due to repeated failed login attempts.`;

  const contentHtml = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; padding: 6px 16px; background-color: #5c1a1a; color: #f87171; font-weight: 800; font-size: 12px; letter-spacing: 0.15em; border-radius: 9999px; text-transform: uppercase;">
        ACCOUNT LOCKED
      </span>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; text-align: center; color: #ede1c9;">
      Your Account Has Been Locked
    </h2>
    <p style="margin: 0 0 24px; font-size: 14px; text-align: center; color: #a89a80;">
      Due to 5 consecutive failed login attempts
    </p>

    <!-- Lockout Details Card -->
    <table role="presentation" width="100%" style="margin: 0 0 24px; background-color: #1a1406; border: 1px solid #5c1a1a; border-radius: 12px;" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 18px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0;">Account:</td>
              <td align="right" style="font-size: 13px; font-weight: 600; color: #ede1c9; padding: 6px 0;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0; border-top: 1px solid #2d2614;">Lockout Duration:</td>
              <td align="right" style="font-size: 13px; font-weight: 700; color: #f87171; padding: 6px 0; border-top: 1px solid #2d2614;">${lockMins} minutes</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0; border-top: 1px solid #2d2614;">Last Attempt IP:</td>
              <td align="right" style="font-size: 13px; font-weight: 600; color: #ede1c9; padding: 6px 0; border-top: 1px solid #2d2614;">${safeIp}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #d6cab2;">
      Hi ${safeName}, your account has been temporarily locked after <strong>5 consecutive failed login attempts</strong>. This is a security measure to protect your account.
    </p>
    <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #a89a80;">
      Your account will automatically unlock after <strong>${lockMins} minutes</strong>. If this wasn't you, someone may be trying to access your account — consider changing your password once the lockout expires.
    </p>

    <div style="text-align: center; margin: 32px 0 12px;">
      <a href="${clientUrl || 'https://picklehub.app'}/login" class="button" style="display: inline-block; padding: 14px 32px; background-color: #ff3b3f; color: #ffffff !important; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; text-transform: uppercase;">
        Try Again Later &rarr;
      </a>
    </div>
  `;

  const html = wrapInBaseLayout({ title: subject, preheader, contentHtml, clientUrl });

  const text = `ACCOUNT LOCKED — THE PICKLEHUB
===================================
Your Account Has Been Temporarily Locked

Hello ${name || 'Athlete'},

Your PickleHub account (${email}) has been locked after 5 consecutive failed login attempts.

Lockout Duration: ${lockMins} minutes
Last Attempt IP: ${ipAddress || 'Unknown'}

Your account will automatically unlock after ${lockMins} minutes.

If this wasn't you, change your password immediately after the lockout expires.

The PickleHub — Competitive Pickleball Sports-Tech Platform`;

  return { subject, html, text };
}

/**
 * Generates Rating Milestone Email (HTML & Plain-Text).
 *
 * @param {object} params
 * @param {string} params.name - Player Name
 * @param {string} params.playerId - Player ID (PH-XXXXX)
 * @param {string} params.oldCategory - Previous skill category
 * @param {string} params.newCategory - New skill category
 * @param {number} params.newRating - Current Elo rating
 * @param {number} params.matchesPlayed - Total matches played
 * @param {number} params.wins - Total wins
 * @param {string} params.clientUrl - Base client URL
 * @returns {{ subject: string, html: string, text: string }}
 */
function renderRatingMilestoneEmail({ name, playerId, oldCategory, newCategory, newRating, matchesPlayed, wins, clientUrl }) {
  const safeName = escapeHtml(name || 'Athlete');
  const safePlayerId = escapeHtml(playerId || 'N/A');
  const safeOldCat = escapeHtml(oldCategory || 'Beginner');
  const safeNewCat = escapeHtml(newCategory || 'Intermediate');

  // Choose emoji and accent based on tier
  const tierConfig = {
    Intermediate: { emoji: '⭐', accent: '#60a5fa', bg: '#1a2e4a' },
    Advanced: { emoji: '🔥', accent: '#fbbf24', bg: '#3d3010' },
    Elite: { emoji: '👑', accent: '#f472b6', bg: '#4a1942' },
  };
  const tier = tierConfig[newCategory] || tierConfig.Intermediate;

  const subject = `${tier.emoji} Tier Promotion! You've Reached ${newCategory}`;
  const preheader = `Congratulations ${safeName}! You've been promoted from ${safeOldCat} to ${safeNewCat}.`;
  const profileUrl = `${clientUrl || 'https://picklehub.app'}/profile/${playerId || ''}`;

  const contentHtml = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; padding: 6px 16px; background-color: ${tier.bg}; color: ${tier.accent}; font-weight: 800; font-size: 12px; letter-spacing: 0.15em; border-radius: 9999px; text-transform: uppercase;">
        ${tier.emoji} TIER PROMOTION
      </span>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; text-align: center; color: #ede1c9;">
      Congratulations, ${safeName}!
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; text-align: center; color: #a89a80;">
      You've been promoted to a new skill tier
    </p>

    <!-- Promotion Card -->
    <table role="presentation" width="100%" style="margin: 0 0 24px; background-color: #1a1406; border: 1px solid #3b3423; border-radius: 12px;" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <div style="font-size: 13px; color: #a89a80; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">
            Skill Tier Advancement
          </div>
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td width="40%" align="center" style="vertical-align: middle;">
                <div style="font-size: 14px; color: #706652; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Previous</div>
                <div style="font-size: 18px; font-weight: 700; color: #a89a80;">${safeOldCat}</div>
              </td>
              <td width="20%" align="center" style="vertical-align: middle;">
                <div style="font-size: 24px; color: ${tier.accent};">&rarr;</div>
              </td>
              <td width="40%" align="center" style="vertical-align: middle;">
                <div style="font-size: 14px; color: ${tier.accent}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">New Tier</div>
                <div style="font-size: 22px; font-weight: 800; color: ${tier.accent};">${tier.emoji} ${safeNewCat}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Stats Summary -->
    <table role="presentation" width="100%" style="margin: 0 0 28px; background-color: #1c1608; border: 1px solid #3b3423; border-radius: 12px;" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 16px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0;">Player ID:</td>
              <td align="right" style="font-size: 13px; font-weight: 700; font-family: monospace; color: #ff3b3f; padding: 6px 0;">${safePlayerId}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0; border-top: 1px solid #2d2614;">Current Rating:</td>
              <td align="right" style="font-size: 13px; font-weight: 700; color: #10b981; padding: 6px 0; border-top: 1px solid #2d2614;">${newRating || 1000} Elo</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0; border-top: 1px solid #2d2614;">Matches Played:</td>
              <td align="right" style="font-size: 13px; font-weight: 600; color: #ede1c9; padding: 6px 0; border-top: 1px solid #2d2614;">${matchesPlayed || 0}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0; border-top: 1px solid #2d2614;">Total Wins:</td>
              <td align="right" style="font-size: 13px; font-weight: 600; color: #ede1c9; padding: 6px 0; border-top: 1px solid #2d2614;">${wins || 0}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #a89a80;">
      Your consistent performance has earned you this promotion. Keep competing and climbing the ranks — the leaderboard awaits!
    </p>

    <div style="text-align: center; margin: 32px 0 12px;">
      <a href="${profileUrl}" class="button" style="display: inline-block; padding: 14px 32px; background-color: #ff3b3f; color: #ffffff !important; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; text-transform: uppercase;">
        View My Profile &rarr;
      </a>
    </div>
  `;

  const html = wrapInBaseLayout({ title: subject, preheader, contentHtml, clientUrl });

  const text = `TIER PROMOTION — THE PICKLEHUB
===================================
${tier.emoji} Congratulations, ${name || 'Athlete'}!

You've been promoted from ${oldCategory || 'Beginner'} to ${newCategory}!

Player ID: ${playerId || 'N/A'}
Current Rating: ${newRating || 1000} Elo
Matches Played: ${matchesPlayed || 0}
Total Wins: ${wins || 0}

Keep competing and climbing the ranks!

View your profile: ${profileUrl}

The PickleHub — Competitive Pickleball Sports-Tech Platform`;

  return { subject, html, text };
}

/**
 * Generates Match Rejected Email (HTML & Plain-Text).
 *
 * @param {object} params
 * @param {string} params.recipientName - Player/Submitter Name
 * @param {string} [params.recipientPlayerId] - Player ID (PH-XXXXX)
 * @param {object} params.match - Populated Match document
 * @param {string} params.rejectionReason - Reason for administrative rejection
 * @param {string} params.clientUrl - Base client URL
 * @returns {{ subject: string, html: string, text: string }}
 */
function renderMatchRejectedEmail({
  recipientName,
  recipientPlayerId,
  match,
  rejectionReason,
  clientUrl,
}) {
  const safeName = escapeHtml(recipientName || 'Athlete');
  const safeMatchId = escapeHtml(match?.matchId || String(match?._id || 'Match'));
  const safeCourt = escapeHtml(match?.court || 'Court');
  const safeMatchType = escapeHtml(match?.matchType || 'MATCH');
  const safeReason = escapeHtml(rejectionReason || 'No reason specified by administrator.');

  const subject = `Match Submission Update: ${safeMatchId} Not Approved`;
  const preheader = `Your match submission for ${safeMatchId} was not approved: ${rejectionReason}`;

  const contentHtml = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; padding: 6px 16px; background-color: #5c1a1a; color: #f87171; font-weight: 800; font-size: 12px; letter-spacing: 0.15em; border-radius: 9999px; text-transform: uppercase;">
        SUBMISSION REJECTED
      </span>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; text-align: center; color: #ede1c9;">
      Match Submission Not Approved
    </h2>
    <p style="margin: 0 0 24px; font-size: 14px; text-align: center; color: #a89a80;">
      Match ${safeMatchId} &bull; ${safeCourt} &bull; ${safeMatchType}
    </p>

    <!-- Details Card -->
    <table role="presentation" width="100%" style="margin: 0 0 24px; background-color: #1a1406; border: 1px solid #5c1a1a; border-radius: 12px;" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 18px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0;">Match ID:</td>
              <td align="right" style="font-size: 13px; font-weight: 700; font-family: monospace; color: #ff3b3f; padding: 6px 0;">${safeMatchId}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #a89a80; padding: 6px 0; border-top: 1px solid #2d2614;">Court / Type:</td>
              <td align="right" style="font-size: 13px; font-weight: 600; color: #ede1c9; padding: 6px 0; border-top: 1px solid #2d2614;">${safeCourt} (${safeMatchType})</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 12px; border-top: 1px solid #2d2614;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #f87171; margin-bottom: 6px;">
                  Rejection Reason:
                </div>
                <div style="font-size: 14px; line-height: 1.5; color: #ede1c9; background-color: #261616; padding: 12px; border-radius: 8px; border-left: 3px solid #f87171;">
                  ${safeReason}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #d6cab2;">
      Hello ${safeName}, the administrator has reviewed the submitted score sheet and did not approve it for official rating calculations.
    </p>
    <p style="margin: 0 0 28px; font-size: 13px; line-height: 1.6; color: #a89a80;">
      No rating changes have been applied to your profile. If you believe this was an error or wish to correct the scores, please contact your court administrator or resubmit the match with the verified score.
    </p>

    <div style="text-align: center; margin: 32px 0 12px;">
      <a href="${clientUrl || 'https://picklehub.app'}/dashboard" class="button" style="display: inline-block; padding: 14px 32px; background-color: #ff3b3f; color: #ffffff !important; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; text-transform: uppercase;">
        View Dashboard &rarr;
      </a>
    </div>
  `;

  const html = wrapInBaseLayout({ title: subject, preheader, contentHtml, clientUrl });

  const text = `MATCH SUBMISSION REJECTED — THE PICKLEHUB
===================================
Match Submission Not Approved

Hello ${recipientName || 'Athlete'},

Your match submission (${match?.matchId || 'Match'}) on ${match?.court || 'Court'} was not approved by an administrator.

Rejection Reason:
${rejectionReason || 'No reason specified'}

No rating changes have been applied. You may resubmit the match with corrected score details or contact your court administrator.

The PickleHub — Competitive Pickleball Sports-Tech Platform`;

  return { subject, html, text };
}
