import{j as e}from"./vendor-motion-Dc5yExsh.js";import{u as c}from"./styled-components.browser.esm-C8Ko4wUD.js";import"./vendor-framework-D3vCv3Kb.js";import"./vendor-supabase-DWrHOPJX.js";const l={visual:{cardBg:"#051914",gradStart:"#059669",gradEnd:"#10b981",title:"#ffffff",text:"rgba(255, 255, 255, 0.9)",shadow:"rgba(5, 150, 105, 0.34)"},vocal:{cardBg:"#30220f",gradStart:"#d88900",gradEnd:"#f2a71c",title:"#fff5e2",text:"rgba(255, 246, 226, 0.92)",shadow:"rgba(95, 56, 2, 0.34)"},verbal:{cardBg:"#132b39",gradStart:"#1d5a7d",gradEnd:"#2e759d",title:"#eef8ff",text:"rgba(224, 240, 255, 0.92)",shadow:"rgba(8, 29, 41, 0.36)"},facial:{cardBg:"#051914",gradStart:"#059669",gradEnd:"#10b981",title:"#ffffff",text:"rgba(255, 255, 255, 0.9)",shadow:"rgba(5, 150, 105, 0.34)"},articulation:{cardBg:"#132b39",gradStart:"#1d5a7d",gradEnd:"#2e759d",title:"#eef8ff",text:"rgba(224, 240, 255, 0.92)",shadow:"rgba(8, 29, 41, 0.36)"},gestures:{cardBg:"#242f38",gradStart:"#5d6f7e",gradEnd:"#74899a",title:"#f4f7fb",text:"rgba(233, 240, 247, 0.92)",shadow:"rgba(34, 43, 50, 0.35)"}};function p({title:i,text:a,tone:r="visual",imageUrl:o,srcSet:n}){const t=l[r]||l.visual;return e.jsx(g,{style:{"--card-bg":t.cardBg,"--grad-start":t.gradStart,"--grad-end":t.gradEnd,"--title-color":t.title,"--text-color":t.text,"--shadow-color":t.shadow},children:e.jsxs("article",{className:"card",children:[e.jsxs("div",{className:"top-section",children:[o&&e.jsx("img",{src:o,srcSet:n,alt:i,className:"card-top-img",loading:"lazy"}),e.jsx("div",{className:"icons",children:e.jsx("span",{className:"logo-text",children:"Bigkas"})})]}),e.jsxs("div",{className:"bottom-section",children:[e.jsx("span",{className:"title",children:i}),e.jsx("p",{className:"description",children:a})]}),e.jsx("div",{className:"glass"})]})})}const g=c.div`
  width: 100%;
  min-height: 466px;
  perspective: 1000px;

  .card {
    width: min(100%, 340px);
    margin: 0 auto;
    height: 466px;
    border-radius: 20px;
    background: var(--card-bg);
    padding: 5px;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    transform-style: preserve-3d;
    transition: all 0.5s ease-in-out;
    box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 20px 0px;
  }

  .card:hover {
    transform: scale(1.03);
    box-shadow: var(--shadow-color) 0px 14px 28px 0px;
  }

  .top-section {
    height: 250px;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    background: linear-gradient(45deg, var(--grad-start) 0%, var(--grad-end) 100%);
    position: relative;
    overflow: hidden;
  }

  .card-top-img {
    position: absolute;
    inset: 15px;
    width: calc(100% - 30px);
    height: calc(100% - 30px);
    object-fit: contain;
    z-index: 0;
    opacity: 1;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .card:hover .card-top-img {
    transform: scale(1.08) translateY(-5px);
  }

  .top-section .icons {
    position: absolute;
    top: 0;
    width: 100%;
    height: 30px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    box-sizing: border-box;
    padding-left: 15px;
  }

  .top-section .icons .logo-text {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #ffffff;
    line-height: 30px;
  }

  .bottom-section {
    margin-top: 14px;
    padding: 8px 9px 10px;
    position: relative;
    z-index: 1;
    box-sizing: border-box;
  }

  .bottom-section .title {
    display: block;
    color: var(--title-color);
    font-weight: 900;
    font-size: 17px;
    text-align: center;
    letter-spacing: 0.04em;
  }

  .bottom-section .description {
    margin: 10px 4px 0;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 5;
    overflow: hidden;
    color: var(--text-color);
    font-size: 16px;
    line-height: 1.33;
    font-weight: 600;
  }

  .glass {
    position: absolute;
    inset: 5px;
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
    border-left: 1px solid rgba(255, 255, 255, 0.18);
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    pointer-events: none;
    transition: all 0.5s ease-in-out;
    z-index: 0;
  }
`,d=[{tone:"visual",title:"Visual",imageUrl:"https://assets.bigkas.site/Sprites/common/Visual.webp",srcSet:"https://assets.bigkas.site/Sprites/common/Visual.webp",text:"Uses computer vision to read your expressions, posture, and gestures. Bigkas helps your nonverbal signals match what you say so you look steady and intentional—not stiff or closed off."},{tone:"vocal",title:"Vocal",imageUrl:"https://assets.bigkas.site/Sprites/common/Vocal.webp",srcSet:"https://assets.bigkas.site/Sprites/common/Vocal.webp",text:"Detects shakiness and uneven volume tied to anxiety. By tracking these acoustic cues, Bigkas steadies your pitch and loudness for a clearer, more grounded delivery."},{tone:"verbal",title:"Verbal",imageUrl:"https://assets.bigkas.site/Sprites/common/Verbal.webp",srcSet:"https://assets.bigkas.site/Sprites/common/Verbal.webp",text:"Scores how clearly you pronounce words and phrases. You get specific feedback on sounds to tighten so listeners can follow you without strain."}];function h({featuresGridRef:i,featureCardIndex:a,goToPreviousFeatureCard:r,goToNextFeatureCard:o,goToFeatureCard:n}){return e.jsx("section",{id:"features",className:"features-section",children:e.jsxs("div",{className:"section-shell features-shell",children:[e.jsxs("div",{className:"features-heading",children:[e.jsx("h2",{children:"The Anatomy of Confidence"}),e.jsx("p",{className:"features-subtitle",children:"Three layers of feedback on how you look, sound, and speak."})]}),e.jsx("div",{ref:i,className:"confidence-grid features-reveal",children:d.map((t,s)=>e.jsx("div",{className:`feature-card-item ${a===s?"is-mobile-active":""}`,children:e.jsx(p,{tone:t.tone,title:t.title,text:t.text,imageUrl:t.imageUrl,srcSet:t.srcSet})},t.title))}),e.jsxs("div",{className:"features-mobile-controls","aria-label":"Feature cards controls",children:[e.jsx("button",{type:"button",className:"features-mobile-btn btn-alt features-mobile-btn-next",onClick:r,children:"Prev"}),e.jsx("div",{className:"features-mobile-dots","aria-label":"Feature card pagination",children:d.map((t,s)=>e.jsx("button",{type:"button",className:`features-mobile-dot ${a===s?"is-active":""}`,onClick:()=>n(s),"aria-label":`Show ${t.title}`,"aria-pressed":a===s},`${t.title}-dot`))}),e.jsx("button",{type:"button",className:"features-mobile-btn btn-main features-mobile-btn-prev",onClick:o,children:"Next"})]})]})})}export{h as default};
//# sourceMappingURL=LandingFeaturesSection-2awzZTUF.js.map
