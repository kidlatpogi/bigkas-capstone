import{r,j as o,b as kt}from"./vendor-framework-Bkk0woJn.js";import{F as It,h as Pt}from"./vendor-icons-extra-BGdEnKvg.js";import{u as jt,a as ht,N as F}from"./index-BDxlg57j.js";/* empty css                        */import"./vendor-icons-core-_X2SfHlq.js";import"./vendor-supabase-DaITVRM7.js";const At=ht("Robot/0008-noBulb-inverted.png"),Mt=F("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 1.mp3"),Rt=F("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 2.mp3"),Bt=F("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 3.mp3"),Lt="https://assets.bigkas.site/Voices/Profiling%20and%20Pre-Testing/Pre-Testing%20Tutorial/pre-testing%20tutorial%204_new.mp3",Nt=F("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 5.mp3"),Vt=F("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial FINAL.mp3"),_t=ht("Robot/0002.webp"),dt="https://assets.bigkas.site/Images/Bigkas-Logo.webp",Ft="Your Streak counter tracks how many consecutive days you've practiced. Consistency is the true secret to mastering public speaking! Log in and complete a daily activity to keep the fire burning and watch that number grow.",Ct="https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Streak-Counter.mp3",$t="https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Voice%202%20-%20Steak-Counter.mp3",zt=Array.from({length:32},(s,b)=>b),bt=r.memo(({text:s,fullText:b,isDone:M,emphasis:v})=>{if(!M)return o.jsx(o.Fragment,{children:s});if(!v)return o.jsx(o.Fragment,{children:b});const u=b.indexOf(v);if(u<0)return o.jsx(o.Fragment,{children:b});const R=b.slice(0,u),C=b.slice(u+v.length);return o.jsxs(o.Fragment,{children:[R,o.jsx("strong",{className:"tutorial-bubble-emphasis",children:v}),C]})});bt.displayName="TypingText";function Ut({isOpen:s,onClose:b,onFinish:M,onStepChange:v=void 0,steps:u=null,robotImage:R=At,finalRobotImage:C=_t,showAudioToggle:ft=!1,onCloseDashboard:k=void 0}){const{user:p,updateUserMetadata:gt}=jt(),tt="bigkas_global_audio_muted_v1",et=r.useMemo(()=>[{id:"step-intro",title:"B-01:",text:"Before we jump in, let's do a quick walkthrough of how this works! Ready to get started?",button:"Continue",targetElementId:null},{id:"step-topic",title:"B-01:",text:"'The Topic' This is for your Verbal analysis! Focus on the prompt shown here to ensure your content is clear and stays on track.",button:"Continue",targetElementId:"tutorial-target-topic",emphasis:"'The Topic'"},{id:"step-camera",title:"B-01:",text:"'The Camera View' This is for your Visual analysis! Position yourself within the guide so I can accurately track your eye contact, expressions, and gestures. Also, make sure you're in a well-lit room so I can see you clearly—good lighting makes for a great performance!",button:"Next",targetElementId:"tutorial-target-camera",emphasis:"'The Camera View'"},{id:"step-soundbar",title:"B-01:",text:"'Voice Meter' This is for your Vocal analysis! Watch the soundbar dance as you speak to see your projection and emotional expression.",button:"Next",targetElementId:"tutorial-target-soundbar",emphasis:"'Voice Meter'"},{id:"step-controls",title:"B-01:",text:"'The Controls', Use Start to begin, Pause if you need a breather, or Restart to try the topic again from the top!",button:"Next",targetElementId:"tutorial-target-controls",emphasis:"'The Controls'"},{id:"step-final",title:"B-01:",text:"Controls mastered! Yay! Whenever you're ready, click Start so I can hear what you've got. I'm so excited to listen!",button:"BEGIN!",targetElementId:null}],[]),Y=r.useMemo(()=>Array.isArray(u)&&u.length>0?u:et,[et,u]),$=r.useMemo(()=>!(Array.isArray(u)&&u.length>0),[u]),f=Array.isArray(u)&&u.length>0,[g,rt]=r.useState(0),[w,G]=r.useState(0),[wt,K]=r.useState(""),[S,W]=r.useState(!1),[d,yt]=r.useState(()=>typeof window!="undefined"&&window.matchMedia("(max-width: 768px)").matches),[h,ot]=r.useState(()=>typeof window=="undefined"?!1:p&&typeof p.isAudioMuted=="boolean"?p.isAudioMuted:window.localStorage.getItem(tt)==="1"),[B,z]=r.useState(null);r.useEffect(()=>{if(typeof window=="undefined")return;const e=window.matchMedia("(max-width: 768px)"),i=()=>yt(e.matches);return typeof e.addEventListener=="function"?(e.addEventListener("change",i),()=>e.removeEventListener("change",i)):(e.addListener(i),()=>e.removeListener(i))},[]),r.useEffect(()=>{p&&typeof p.isAudioMuted=="boolean"&&ot(p.isAudioMuted)},[p==null?void 0:p.isAudioMuted]);const n=r.useRef(null),it=r.useRef(null),T=r.useRef([]),x=r.useRef(null),l=r.useRef(null),X=r.useRef(!1),J=r.useRef(!1),at=r.useRef(h);r.useEffect(()=>{at.current=h},[h]);const[I,O]=r.useState(null),t=r.useMemo(()=>Y[g],[Y,g]),U=r.useMemo(()=>t!=null&&t.text?t.textPart2&&w===1?t.textPart2:d&&t.id==="step-streak"?Ft:t.text:"",[t,d,w]),Z=r.useMemo(()=>{var e;return t?d&&t.id==="step-streak"?(localStorage.getItem("bigkas_b01_voice")||"voice1")==="voice2"?$t:Ct:w===1&&t.voicePart2?t.voicePart2:w===1?null:(e=t.voice)!=null?e:null:null},[t,d,w]),nt=r.useMemo(()=>t?t.robot||(t.id==="step-final"?C:R):R,[t,C,R]),xt=(t==null?void 0:t.id)==="step-intro"||(t==null?void 0:t.id)==="step-companion",P=!!(!f&&d&&(t==null?void 0:t.id)!=="step-final"||f&&((t==null?void 0:t.id)==="step-streak"||d&&!xt)),vt=r.useMemo(()=>P?dt:nt,[P,nt]),q=(t==null?void 0:t.targetElementId)==="tutorial-target-home-streak"||(t==null?void 0:t.targetElementId)==="tutorial-target-home-rank"||(t==null?void 0:t.targetElementId)==="tutorial-target-home-practice",st=(t==null?void 0:t.id)==="step-streak",Q=()=>{typeof document!="undefined"&&document.querySelectorAll(".tutorial-spotlight-active").forEach(e=>{e.classList.remove("tutorial-spotlight-active")})},j=()=>{T.current.forEach(e=>{e&&(e.pause(),e.currentTime=0)}),x.current&&(x.current.pause(),x.current.currentTime=0,x.current=null)},lt=(e,i="B-01 voice")=>{e&&(e.muted=!1,e.currentTime=0,e.onerror=()=>{console.warn(`[TutorialOverlayMobile] ${i} unavailable.`)},e.play().catch(a=>{console.warn(`[TutorialOverlayMobile] ${i} play failed:`,a)}))},Et=()=>{ot(e=>{const i=!e;return typeof window!="undefined"&&window.localStorage.setItem(tt,i?"1":"0"),p!=null&&p.id&&gt({is_audio_muted:i}).catch(()=>{}),i&&j(),i})};if(r.useEffect(()=>{if(!$){T.current=[];return}return T.current=[new Audio(Mt),new Audio(Rt),new Audio(Bt),new Audio(Lt),new Audio(Nt),new Audio(Vt)],T.current.forEach(e=>{e&&(e.preload="none")}),()=>{j(),T.current=[]}},[$]),r.useEffect(()=>{T.current.forEach(e=>{e&&(e.muted=h,h&&(e.pause(),e.currentTime=0))}),x.current&&(x.current.muted=h,h&&(x.current.pause(),x.current.currentTime=0))},[h]),r.useEffect(()=>{if(s){J.current=!0,Q(),rt(0),G(0);return}J.current&&k&&f&&d&&k(),J.current=!1,Q(),j(),l.current&&(window.clearInterval(l.current),l.current=null),n.current&&(n.current.classList.remove("tutorial-spotlight-active"),n.current.style.removeProperty("pointer-events"),n.current=null)},[s,k,f,d]),r.useEffect(()=>{G(0),v&&t&&v({step:t,index:g})},[g,t,v]),r.useEffect(()=>{X.current=!1},[g]),r.useEffect(()=>{var A;if(!s||!t)return;const e=t.targetElementId;if(e!=="tutorial-target-home-streak"&&e!=="tutorial-target-home-rank"&&e!=="tutorial-target-home-practice"||typeof document=="undefined"||document.getElementById(e)||X.current)return;const i=document.querySelector(".activity-mobile-dashboard-section"),a=i==null?void 0:i.querySelector("button.activity-mobile-dashboard-btn"),c=(A=a==null?void 0:a.textContent)==null?void 0:A.trim().toLowerCase();a&&c==="dashboard"&&(a.click(),X.current=!0)},[s,t==null?void 0:t.id,t==null?void 0:t.targetElementId,g]),r.useEffect(()=>{if(!s||!t)return;Q(),n.current&&(n.current.classList.remove("tutorial-spotlight-active"),n.current.style.removeProperty("z-index"),n.current.style.removeProperty("pointer-events"),n.current=null);const e=t==null?void 0:t.targetElementId,i=f&&e==="tutorial-target-home-journey"?"4600":"4800",a=e==="tutorial-target-home-streak"||e==="tutorial-target-home-rank"||e==="tutorial-target-home-practice",c=e==="tutorial-target-home-journey",A=e==="tutorial-target-home-streak"||e==="tutorial-target-home-rank"||e==="tutorial-target-home-practice",E=a||c?48:6,L=a||c?80:60;let N=!1,V=null;const H=(_=0)=>{if(N||!e)return;const y=document.getElementById(e);if(y){const D=e==="tutorial-target-home-journey";if(D?y.querySelector(".skyward-journey-node--active"):!0){if(y.classList.add("tutorial-spotlight-active"),y.style.setProperty("z-index",i,"important"),A&&y.style.setProperty("pointer-events","none","important"),n.current=y,e==="tutorial-target-home-practice"){const m=document.querySelector(".dashboard-overlay-scroll-content")||document.querySelector(".dashboard-overlay-content");if(m){try{m.scrollTo({top:m.scrollHeight,behavior:"smooth"})}catch{m.scrollTop=m.scrollHeight}setTimeout(()=>{m&&(m.scrollTop=m.scrollHeight)},60)}}else if(D)try{const m=y.querySelector(".skyward-journey-node--active");m&&m.scrollIntoView({behavior:"smooth",block:"center"})}catch{}else try{y.scrollIntoView({behavior:"smooth",block:"center"})}catch{}return}}_>=E||(V=window.setTimeout(()=>H(_+1),L))};return e&&H(0),()=>{N=!0,V&&window.clearTimeout(V),n.current&&(n.current.classList.remove("tutorial-spotlight-active"),n.current.style.removeProperty("z-index"),n.current.style.removeProperty("pointer-events"),n.current=null)}},[s,t==null?void 0:t.targetElementId,f]),r.useEffect(()=>{if(!s||(t==null?void 0:t.targetElementId)!=="tutorial-target-soundbar"){z(null);return}let e=0;const i=()=>{e=window.requestAnimationFrame(()=>{const a=document.getElementById("tutorial-target-soundbar");if(!a){z(null);return}const c=a.getBoundingClientRect();z({top:c.top,left:c.left,width:c.width,height:c.height})})};return i(),window.addEventListener("resize",i),window.addEventListener("scroll",i,!0),()=>{e&&window.cancelAnimationFrame(e),window.removeEventListener("resize",i),window.removeEventListener("scroll",i,!0),z(null)}},[s,t==null?void 0:t.targetElementId]),r.useEffect(()=>{!s||!d||!f||!k||(t==null?void 0:t.targetElementId)==="tutorial-target-home-journey"&&k()},[s,d,f,t==null?void 0:t.targetElementId,g,w,k]),r.useEffect(()=>{if(!s||!t){O(null);return}if(!(!(!f&&d&&(t.id==="step-controls"||t.id==="step-soundbar"))&&(t.id==="step-controls"||t.id==="step-soundbar"||t.id==="step-roadmap"||t.id==="step-practice"))){O(null);return}let a=0,c=0;const A=()=>{const L=t.targetElementId?document.getElementById(t.targetElementId):null,N=it.current;if(!L||!N)return!1;const V=L.getBoundingClientRect(),H=N.getBoundingClientRect(),_=parseFloat(window.getComputedStyle(document.documentElement).fontSize)||16,y=t.id==="step-roadmap"?_:0,D=_*2+y,pt=Math.max(8,V.top-H.height-D);return O({top:`${pt}px`,bottom:"auto",zIndex:5100}),!0},E=()=>{a=window.requestAnimationFrame(()=>{A()||(c=window.setTimeout(E,60))})};return E(),window.addEventListener("resize",E),window.addEventListener("orientationchange",E),()=>{a&&window.cancelAnimationFrame(a),c&&window.clearTimeout(c),window.removeEventListener("resize",E),window.removeEventListener("orientationchange",E)}},[s,t==null?void 0:t.id,t==null?void 0:t.targetElementId,w,f,d]),r.useEffect(()=>{if(!s||!t)return;K(""),W(!1),l.current&&(window.clearInterval(l.current),l.current=null);let e=0;const i=U;if(l.current=window.setInterval(()=>{e+=1,K(i.slice(0,e)),e>=i.length&&(l.current&&(window.clearInterval(l.current),l.current=null),W(!0))},12),!at.current){if(j(),Z){const a=new Audio(Z);x.current=a,lt(a,"Custom voice")}else if($){const a=T.current[g];a&&lt(a,`Tutorial voice ${g+1}`)}}return()=>{l.current&&(window.clearInterval(l.current),l.current=null),j()}},[g,s,$,t==null?void 0:t.id,U,Z,w]),!s||!t)return null;const Tt=()=>{if(j(),!S){K(U),W(!0),l.current&&(window.clearInterval(l.current),l.current=null);return}if(t.textPart2&&w===0){G(1);return}if(g>=Y.length-1){n.current&&(n.current.classList.remove("tutorial-spotlight-active"),n.current.style.removeProperty("z-index"),n.current.style.removeProperty("pointer-events"),n.current=null),M==null||M(),b==null||b();return}rt(i=>i+1)},ut=`tutorial-overlay-wrapper${f?" is-custom-tutorial":" is-default-tutorial"}${(t==null?void 0:t.id)==="step-controls"?" is-controls-step":""}${(t==null?void 0:t.id)==="step-soundbar"?" is-soundbar-step":""}${(t==null?void 0:t.id)==="step-final"?" is-final-step":""}${(t==null?void 0:t.id)==="step-rank"?" is-rank-step":""}${t!=null&&t.robotClassName?` ${t.robotClassName}`:""}`,ct=o.jsx(o.Fragment,{children:o.jsxs("div",{className:"tutorial-companion-container",ref:it,style:q?{...I!=null?I:{},pointerEvents:"auto"}:I!=null?I:void 0,children:[P?null:o.jsx("img",{src:vt,alt:"",className:"tutorial-robot-img","aria-hidden":"true"}),o.jsxs("article",{className:`tutorial-speech-bubble${P?" tutorial-speech-bubble--logo":""}`,children:[o.jsx("div",{className:`tutorial-bubble-title${P?" tutorial-bubble-title--with-brand":""}`,children:P?o.jsxs(o.Fragment,{children:[o.jsx("img",{src:dt,alt:"",className:"tutorial-bubble-title-logo",width:36,height:36}),o.jsx("span",{className:"tutorial-bubble-title-label",children:t.title})]}):t.title}),o.jsx("p",{className:"tutorial-bubble-text",children:o.jsx(bt,{text:wt,fullText:U,isDone:S,emphasis:w===0?t.emphasis:void 0})}),o.jsxs("div",{className:"tutorial-bubble-footer",children:[ft&&o.jsx("button",{type:"button",onClick:Et,"aria-label":h?"Unmute B-01 voice":"Mute B-01 voice",title:h?"Unmute B-01 voice":"Mute B-01 voice",className:`tutorial-audio-toggle ${h?"is-muted":"is-unmuted"}`,children:h?o.jsx(It,{"aria-hidden":"true"}):o.jsx(Pt,{"aria-hidden":"true"})}),o.jsx("button",{type:"button",className:"tutorial-bubble-btn",onClick:Tt,disabled:!S,children:t.button})]})]})]})}),mt=q&&typeof document!="undefined"?kt.createPortal(o.jsxs(o.Fragment,{children:[st?o.jsx("div",{className:"bigkas-modal-scrim bigkas-modal-scrim--no-enter tutorial-mobile-streak-scrim","aria-hidden":"true",style:{position:"fixed",inset:0,zIndex:1800,pointerEvents:"none",background:"rgba(15, 23, 42, 0.5)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}):null,o.jsx("div",{className:ut,style:{position:"fixed",inset:0,zIndex:7200,pointerEvents:"none"},"aria-label":"Training tutorial overlay",children:ct})]}),document.body):null;return o.jsxs(o.Fragment,{children:[s&&st?o.jsx("style",{children:`
          /*
           * Streak tutorial: scrim is portaled to document.body (z-index 1800). #root stacks as auto,
           * so the scrim paints above the whole app and hides the spotlight. Raise #root while this
           * step is open so dashboard content (including #tutorial-target-home-streak) stacks above the scrim.
           */
          #root {
            position: relative;
            z-index: 1850 !important;
          }
        `}):null,q?null:o.jsx("div",{className:"tutorial-dark-bg","aria-hidden":"true"}),B&&o.jsx("div",{className:"tutorial-soundbar-spotlight-clone","aria-hidden":"true",style:{top:`${B.top}px`,left:`${B.left}px`,width:`${B.width}px`,height:`${B.height}px`},children:o.jsx("div",{className:"tutorial-soundbar-preview-bars",children:zt.map(e=>o.jsx("span",{style:{"--bar-index":e,"--bar-height":`${18+e%8*9}%`}},e))})}),o.jsx("style",{children:`
        #tutorial-target-home-journey.tutorial-spotlight-active button {
          pointer-events: none !important;
          cursor: default !important;
        }
        .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-speech-bubble--logo::before,
        .tutorial-overlay-wrapper.is-default-tutorial .tutorial-speech-bubble--logo::before,
        .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-3 .tutorial-speech-bubble::before {
          display: none !important;
          content: none !important;
          border: none !important;
        }
        .tutorial-bubble-title--with-brand {
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          flex-wrap: nowrap !important;
          font-weight: 400 !important;
        }
        .tutorial-bubble-title-logo {
          width: 36px !important;
          height: 36px !important;
          object-fit: contain !important;
          flex-shrink: 0 !important;
          display: block !important;
        }
        .tutorial-bubble-title--with-brand .tutorial-bubble-title-label {
          font-family: 'Fredoka', sans-serif !important;
          font-weight: 400 !important;
          color: #059669 !important;
        }
        /* Mobile activity tutorial: logo mark + bubble; dashboard steps portal above sheets */
        @media (max-width: 768px) {
          /* Automatically suppress the tutorial's standalone dark background scrim whenever the dashboard sheet is actively open */
          body:has(.dashboard-overlay-wrapper) .tutorial-dark-bg,
          body.dashboard-overlay-open .tutorial-dark-bg {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          /* Ensure targeted elements inside the dashboard sheet elevate properly into the sheet's stacking context */
          .dashboard-overlay-content .tutorial-spotlight-active {
            position: relative !important;
            z-index: 5500 !important;
            background: #ffffff !important;
            border-radius: 20px !important;
            opacity: 1 !important;
            filter: none !important;
            box-shadow: 0 0 0 4px #34D399, 0 12px 36px rgba(0, 0, 0, 0.28) !important;
          }
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-scroll-content > *:not(.tutorial-spotlight-active),
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-header {
            opacity: 0.35 !important;
            filter: brightness(0.5) !important;
            pointer-events: none !important;
            transition: opacity 0.3s ease, filter 0.3s ease !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-companion-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 0.5rem !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(calc(100vw - clamp(16px, 6vw, 32px)), 54rem) !important;
            max-width: calc(100vw - 32px) !important;
            bottom: calc(clamp(104px, 18vh, 148px) + env(safe-area-inset-bottom, 0px)) !important;
            top: auto !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-rank-step .tutorial-companion-container {
            top: calc(16px + 2rem + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
          }
          /* Home streak (activity step 3): pin speech bubble to top so the streak card stays visible below */
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-3 .tutorial-companion-container {
            top: calc(16px + 0.5rem + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
            left: 16px !important;
            transform: none !important;
            align-items: stretch !important;
            width: min(calc(100vw - 32px), 54rem) !important;
            max-width: calc(100vw - 32px) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-practice-step .tutorial-companion-container {
            top: calc(16px + 0.5rem + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
          }
          /* Roadmap: Positioned at bottom with 1rem gap above bottom navigation */
          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-companion-container {
            top: auto !important;
            bottom: calc(64px + 1rem + env(safe-area-inset-bottom, 0px)) !important;
            gap: 0.5rem !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-speech-bubble {
            padding-bottom: 0.65rem !important;
          }
          /* New positioning for mute button inside bubble */
          .tutorial-bubble-footer {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
            gap: 12px !important;
            margin-top: 10px !important;
            clear: both !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle {
            position: relative !important;
            inset: auto !important;
            transform: none !important;
            flex-shrink: 0 !important;
            width: clamp(3rem, 5.5vw, 3.45rem) !important;
            height: clamp(3rem, 5.5vw, 3.45rem) !important;
            min-height: 44px !important;
            min-width: 44px !important;
            border-radius: 0.95rem !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle:hover {
            transform: translateY(2px) !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-unmuted:hover {
            box-shadow: #047857 0 3px 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-muted:hover {
            box-shadow: #B91C1C 0 3px 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle:active {
            transform: translateY(5px) !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-unmuted:active {
            box-shadow: #047857 0 0 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-muted:active {
            box-shadow: #B91C1C 0 0 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-bubble-btn {
            float: none !important;
            margin: 0 !important;
            flex: 0 0 auto !important;
          }

          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-bubble-text {
            max-height: min(26vh, 132px) !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-robot-img:not(.tutorial-robot-img--logo) {
            max-height: 76px !important;
            max-width: 148px !important;
            width: auto !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-speech-bubble {
            order: 1 !important;
            z-index: 1301 !important;
            width: 100% !important;
            max-width: min(100%, 48rem) !important;
            margin: 0 !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial .tutorial-speech-bubble--logo {
            width: 100% !important;
            max-width: min(100%, 48rem) !important;
            margin: 0 !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial .tutorial-companion-container {
            align-items: stretch !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial.is-final-step .tutorial-companion-container {
            top: calc(clamp(96px, 15vh, 128px) + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(calc(100vw - 32px), 420px) !important;
            max-width: calc(100vw - 32px) !important;
            align-items: center !important;
            justify-content: flex-start !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial.is-final-step .tutorial-speech-bubble {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-1 .tutorial-speech-bubble,
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-2 .tutorial-speech-bubble {
            transform: translateY(8rem) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial:not(.is-activity-home-step-1):not(.is-activity-home-step-2) .tutorial-speech-bubble {
            transform: translateY(0) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-speech-bubble::before {
            left: 50% !important;
            top: auto !important;
            bottom: -12px !important;
            border-top: 12px solid #FDFDF9 !important;
            border-bottom: 0 !important;
            border-right: 12px solid transparent !important;
            border-left: 12px solid transparent !important;
            transform: translateX(-50%) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-robot-img.tutorial-robot-img--logo {
            order: 2 !important;
            width: auto !important;
            max-width: 180px !important;
            max-height: 64px !important;
            height: auto !important;
            object-fit: contain !important;
            filter: none !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-robot-img:not(.tutorial-robot-img--logo) {
            order: 2 !important;
            width: clamp(160px, 48vw, 280px) !important;
            height: auto !important;
            filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.18)) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-1 .tutorial-robot-img:not(.tutorial-robot-img--logo),
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-2 .tutorial-robot-img:not(.tutorial-robot-img--logo) {
            order: 2 !important;
            width: clamp(320px, 85vw, 520px) !important;
            height: auto !important;
            filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.18)) !important;
          }
        }
      `}),q&&mt?mt:o.jsx("section",{className:ut,"aria-label":"Training tutorial overlay",children:ct})]})}const Wt=r.memo(Ut);export{Wt as default};
