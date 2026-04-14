import { Shield, Server, Database, Trash2, Download, Mail, Eye, Clock, Globe } from 'lucide-react';
import LegalConfig from '../config/legalConfig';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20">
          <Icon className="w-4 h-4 text-dream-600 dark:text-dream-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-white/70 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function TLDRCard() {
  return (
    <div className="rounded-2xl border-2 border-dream-400/30 bg-gradient-to-br from-dream-50 to-purple-50 dark:from-dream-500/10 dark:to-purple-500/5 p-6 mb-10">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Shield className="w-5 h-5 text-dream-500" />
        TL;DR — The Short Version
      </h2>
      <ul className="space-y-2 text-sm text-gray-700 dark:text-white/80">
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <span>Your child's photos are processed by AI <strong>in memory only</strong> and deleted within 60 seconds. They never touch a disk.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <span>We only ask for your child's <strong>first name and age</strong>. Never a full name or date of birth.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <span>AI-generated images and audio are stored on <strong>Cloudflare R2 (EU)</strong> until you delete them.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <span>We comply with <strong>GDPR, COPPA, and the UK Children's Code</strong>.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <span>You can <strong>export or delete all your data</strong> at any time from your dashboard.</span>
        </li>
      </ul>
    </div>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-night-950">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 dark:text-white/40">
            Effective: {LegalConfig.effectiveDate} · Jurisdiction: {LegalConfig.jurisdiction}
          </p>
        </header>

        <TLDRCard />

        <Section icon={Eye} title="1. Who We Are">
          <p>
            <strong>{LegalConfig.companyName}</strong> ({LegalConfig.legalEntity}) is the data controller for personal data processed through this service. Our Data Protection Officer can be reached at{' '}
            <a href={`mailto:${LegalConfig.dpoEmail}`} className="text-dream-500 hover:underline">{LegalConfig.dpoEmail}</a>.
          </p>
          <p>
            We operate under the <strong>UK GDPR</strong>, the <strong>Data Protection Act 2018</strong>, and comply with the{' '}
            <strong>US Children's Online Privacy Protection Act (COPPA)</strong> and the <strong>UK Age Appropriate Design Code</strong> (Children's Code).
          </p>
        </Section>

        <Section icon={Database} title="2. What Data We Collect">
          <table className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="text-left p-3 font-semibold">Category</th>
                <th className="text-left p-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              <tr>
                <td className="p-3 font-medium">Parent account</td>
                <td className="p-3">Name, email address (via Clerk)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Child data</td>
                <td className="p-3">First name and age only. We never collect full names or dates of birth.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Uploaded photos</td>
                <td className="p-3">Processed in-memory by AI vision models. <strong>Never written to disk.</strong> Purged from RAM within 60 seconds.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Voice samples</td>
                <td className="p-3">Processed in-memory for voice cloning. <strong>Never written to disk.</strong> Purged from RAM within 60 seconds.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Generated content</td>
                <td className="p-3">AI-generated stories, illustrations, and audio stored on Cloudflare R2 (EU region).</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section icon={Shield} title="3. The /tmp Protection — How We Handle Raw Data">
          <p>
            When you upload a photograph, it is <strong>never written to persistent storage</strong>. Here is exactly what happens:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>The photo is received by our server and held <strong>in RAM only</strong>.</li>
            <li>It is immediately sent to an AI vision model (Google Gemini) for feature extraction.</li>
            <li>The AI returns text descriptions — hair colour, eye colour, personality traits — <strong>no image data is retained by the AI</strong>.</li>
            <li>Within <strong>60 seconds of receipt</strong>, the raw photo buffer is garbage-collected from memory.</li>
            <li>No copy of the original photo is ever written to a database, disk, or our servers' /tmp directory.</li>
          </ol>
          <p>
            The same in-memory-only process applies to 15-second voice samples used for text-to-speech voice cloning.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
              What we keep: Only the <em>AI-generated descriptions</em> (e.g. "a boy with curly brown hair and green eyes") which contain no identifiable biometric data.
            </p>
          </div>
        </Section>

        <Section icon={Clock} title="4. Legal Basis for Processing">
          <table className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="text-left p-3 font-semibold">Purpose</th>
                <th className="text-left p-3 font-semibold">Legal Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {Object.entries(LegalConfig.legalBases).map(([key, basis]) => (
                <tr key={key}>
                  <td className="p-3 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                  <td className="p-3">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3">
            For children's data, we rely on <strong>explicit parental consent</strong> obtained through our Parental Consent flow before any processing begins (GDPR Article 8, COPPA Section 312.5).
          </p>
        </Section>

        <Section icon={Globe} title="5. Our Sub-Processors">
          <p>We share limited data with the following processors under strict Data Processing Agreements:</p>
          <table className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="text-left p-3 font-semibold">Provider</th>
                <th className="text-left p-3 font-semibold">Purpose</th>
                <th className="text-left p-3 font-semibold">Location</th>
                <th className="text-left p-3 font-semibold">Transfer Mechanism</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {LegalConfig.subProcessors.map((sp) => (
                <tr key={sp.name}>
                  <td className="p-3 font-medium">{sp.name}</td>
                  <td className="p-3">{sp.purpose}</td>
                  <td className="p-3">{sp.location}</td>
                  <td className="p-3">{sp.adequacy}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3">
            We do <strong>not</strong> sell data to third parties. We do <strong>not</strong> use children's data for marketing or profiling.
          </p>
        </Section>

        <Section icon={Database} title="6. Data Retention">
          <table className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="text-left p-3 font-semibold">Data Type</th>
                <th className="text-left p-3 font-semibold">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {Object.entries(LegalConfig.retentionPeriods).map(([key, period]) => (
                <tr key={key}>
                  <td className="p-3 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                  <td className="p-3">{period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section icon={Download} title="7. Your Controls">
          <p>As a parent or guardian, you have full control over your family's data:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Export My Data:</strong> Download a complete archive of all stories, images, and account data in machine-readable JSON format.</li>
            <li><strong>Delete My Data:</strong> Permanently delete all stories, images, audio, and account data. This action is irreversible and completed within 48 hours.</li>
            <li><strong>Withdraw Consent:</strong> Revoke any or all processing consents at any time from your dashboard. Revoking consent stops future processing but does not retroactively delete already-generated content (use Delete for that).</li>
            <li><strong>Revoke AI Processing:</strong> Disable image processing or voice cloning individually while keeping your account active.</li>
          </ul>
          <p>
            To exercise any right, visit your <strong>Dashboard → Privacy Controls</strong> or email{' '}
            <a href={`mailto:${LegalConfig.contactEmail}`} className="text-dream-500 hover:underline">{LegalConfig.contactEmail}</a>.
          </p>
        </Section>

        <Section icon={Shield} title="8. Children's Privacy (COPPA & UK Children's Code)">
          <ul className="list-disc pl-5 space-y-2">
            <li>We do not knowingly collect personal information from children under 13 without verifiable parental consent.</li>
            <li>Our age gate requires the parent to confirm they are over 18 and the legal guardian before any data collection begins.</li>
            <li>We collect only the minimum data necessary: first name and age. We never collect school name, address, or contact information.</li>
            <li>Children cannot create accounts or interact with the service independently.</li>
            <li>Parents may review, modify, or delete their child's data at any time.</li>
          </ul>
          <p>
            If you believe we have collected data from a child without appropriate consent, contact us immediately at{' '}
            <a href={`mailto:${LegalConfig.contactEmail}`} className="text-dream-500 hover:underline">{LegalConfig.contactEmail}</a>.
          </p>
        </Section>

        <Section icon={Server} title="9. Security Measures">
          <ul className="list-disc pl-5 space-y-2">
            <li>All data in transit is encrypted with TLS 1.3.</li>
            <li>AI-generated content at rest is encrypted on Cloudflare R2 (AES-256).</li>
            <li>Raw user photos are processed in isolated memory and never persisted.</li>
            <li>Access to production data is restricted to authorised personnel via MFA.</li>
            <li>We conduct annual security audits and maintain a vulnerability disclosure programme.</li>
          </ul>
        </Section>

        <Section icon={Mail} title="10. Contact Us">
          <p>
            For any privacy-related questions, data subject requests, or complaints:
          </p>
          <ul className="list-none space-y-1">
            <li><strong>General:</strong> <a href={`mailto:${LegalConfig.contactEmail}`} className="text-dream-500 hover:underline">{LegalConfig.contactEmail}</a></li>
            <li><strong>Data Protection Officer:</strong> <a href={`mailto:${LegalConfig.dpoEmail}`} className="text-dream-500 hover:underline">{LegalConfig.dpoEmail}</a></li>
            <li><strong>Supervisory Authority:</strong> {LegalConfig.supervisoryAuthority} (<a href="https://ico.org.uk" className="text-dream-500 hover:underline" target="_blank" rel="noopener noreferrer">ico.org.uk</a>)</li>
          </ul>
        </Section>

        <footer className="pt-8 border-t border-gray-200 dark:border-white/10 text-xs text-gray-400 dark:text-white/30">
          <p>Last updated: {LegalConfig.effectiveDate}</p>
          <p className="mt-1">We reserve the right to update this policy. Material changes will be communicated via email 30 days in advance.</p>
        </footer>
      </div>
    </div>
  );
}
