/**
 * Intro du site (≈ 1,3 s, terracotta profond) jouée une fois par session.
 * Entièrement en CSS (globals.css, `.site-intro`) : elle ne retarde ni le
 * rendu ni l'hydratation. Le script, placé AVANT le rideau, marque la page
 * comme déjà vue pour que le rideau ne soit jamais peint aux visites
 * suivantes. Masquée en mouvement réduit.
 */
const script = `try{if(sessionStorage.getItem('centrium-intro')==='1'){document.documentElement.setAttribute('data-intro','seen')}else{sessionStorage.setItem('centrium-intro','1')}}catch(e){document.documentElement.setAttribute('data-intro','seen')}`;

export function Intro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <div className="site-intro" aria-hidden>
        <div className="site-intro__inner">
          <div className="site-intro__mask">
            <span className="site-intro__word">Centrium</span>
          </div>
          <span className="site-intro__line" />
          <span className="site-intro__sub">Le cockpit des ESN modernes</span>
        </div>
      </div>
    </>
  );
}
