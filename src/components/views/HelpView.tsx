import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Image as ImageIcon, 
  Film, 
  Music, 
  Mail, 
  MessageSquare, 
  Send,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HelpView: React.FC = () => {
  const { addNotification } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const faqs = [
    {
      q: 'Comment fonctionnent les crédits sur MUNGWELE IA STUDIO ?',
      a: 'Chaque génération consomme un nombre prédéfini de crédits (ex: 5 à 8 crédits pour une image, 15 à 25 crédits pour une vidéo Veo 3, 10 crédits pour un titre Suno). En cas d’erreur lors de la génération, vos crédits sont automatiquement remboursés sur votre solde.',
    },
    {
      q: 'Comment fonctionne Google Veo 3 pour la vidéo ?',
      a: 'Google Veo 3 génère des vidéos cinématiques fluides jusqu’en 4K 60fps. Vous pouvez générer à partir d’un prompt textuel (Text-to-Video) ou importer une image existante depuis le Studio Image pour lui donner vie (Image-to-Video).',
    },
    {
      q: 'Puis-je utiliser mes créations à des fins commerciales ?',
      a: 'Oui, avec les forfaits Créateur, Pro Studio et Entreprise, toutes vos générations (images, vidéos, musiques) vous appartiennent et peuvent être utilisées librement pour vos réseaux sociaux, publicités ou projets clients.',
    },
    {
      q: 'Comment rédiger un prompt efficace avec l’IA ?',
      a: 'Utilisez le bouton « Améliorer avec l’IA » présent dans chaque studio. Notre assistant IA enrichit votre idée avec le cadrage, l’éclairage volumétrique, les mouvements de caméra et le style visuel adéquat.',
    },
    {
      q: 'Comment fonctionne le Studio Musique Suno ?',
      a: 'Le studio compose des morceaux audio complets avec mastering stéréo. Vous pouvez soit écrire vos propres paroles, soit demander à l’IA de les composer automatiquement avec couplets et refrains, ou bien choisir le mode Instrumental.',
    },
  ];

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setContactSubject('');
      setContactMessage('');
      addNotification('success', 'Message envoyé !', 'Notre équipe technique vous répondra dans les plus brefs délais.');
    }, 800);
  };

  return (
    <div id="help-view-container" className="w-full max-w-4xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-semibold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Centre d'Aide & Documentation</span>
        </div>
        <h2 className="text-3xl font-display font-extrabold text-white">
          Foire Aux Questions & Support
        </h2>
        <p className="text-xs sm:text-sm text-gray-400">
          Trouvez des réponses rapides sur le fonctionnement des 3 studios et l'utilisation des crédits.
        </p>
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openFaq === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden transition-all shadow-md"
            >
              <button
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className="text-sm font-bold text-white pr-4">{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-purple-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs text-gray-300 leading-relaxed border-t border-white/10 pt-3 bg-white/[0.02]">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-2 shadow-lg hover:border-purple-500/30 transition-all">
          <div className="p-2 rounded-xl bg-purple-950/60 text-purple-300 w-fit border border-purple-500/30">
            <ImageIcon className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white">Guide Studio Image</h4>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Astuces pour des reflets parfaits, choix des résolutions et composition des scènes.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-2 shadow-lg hover:border-pink-500/30 transition-all">
          <div className="p-2 rounded-xl bg-pink-950/60 text-pink-300 w-fit border border-pink-500/30">
            <Film className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white">Guide Studio Vidéo</h4>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Maîtriser les mouvements de drone, les durées et la liaison Image-to-Video.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-2 shadow-lg hover:border-blue-500/30 transition-all">
          <div className="p-2 rounded-xl bg-blue-950/60 text-blue-300 w-fit border border-blue-500/30">
            <Music className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white">Guide Studio Musique</h4>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Structuration des paroles avec [Couplet], [Refrain] et choix des ambiances sonores.
          </p>
        </div>
      </div>

      {/* Contact Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-300 border border-purple-500/30">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Contacter le Support Technique</h3>
            <p className="text-xs text-gray-400">Une question ou une suggestion ? Écrivez-nous directement.</p>
          </div>
        </div>

        <form onSubmit={handleSendSupport} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Sujet</label>
            <input
              type="text"
              value={contactSubject}
              onChange={(e) => setContactSubject(e.target.value)}
              placeholder="Ex: Question sur la facturation ou proposition de fonctionnalité..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Message</label>
            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Détaillez votre demande..."
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-purple-500 resize-none"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSending}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white flex items-center space-x-2 shadow-md transition-all disabled:opacity-50 border border-white/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Envoi...' : 'Envoyer le message'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
