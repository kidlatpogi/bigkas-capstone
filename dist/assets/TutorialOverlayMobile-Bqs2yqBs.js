import{r,j as o,b as Et}from"./vendor-framework-CmdwDIpY.js";import{F as Tt,h as kt}from"./vendor-icons-extra-BbDndVS0.js";import{a as pt,b as N}from"./assetUtils-DiP9gMzg.js";import{u as It}from"./index-pHM1fBJ2.js";/* empty css                        */import"./vendor-icons-core-C188kJ_F.js";import"./vendor-supabase-DaITVRM7.js";const At=pt("Robot/0008-noBulb-inverted.png"),Pt=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 1.mp3"),jt=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 2.mp3"),Mt=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 3.mp3"),Rt="https://assets.bigkas.site/Voices/Profiling%20and%20Pre-Testing/Pre-Testing%20Tutorial/pre-testing%20tutorial%204_new.mp3",Bt=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 5.mp3"),Lt=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial FINAL.mp3"),Nt=pt("Robot/0002.webp"),mt="https://assets.bigkas.site/Images/Bigkas-Logo.webp",Ft="Your Streak counter tracks how many consecutive days you've practiced. Consistency is the true secret to mastering public speaking! Log in and complete a daily activity to keep the fire burning and watch that number grow.",Vt="https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Streak-Counter.mp3",Ct=Array.from({length:32},(s,h)=>h),dt=r.memo(({text:s,fullText:h,isDone:B,emphasis:u})=>{if(!B)return o.jsx(o.Fragment,{children:s});if(!u)return o.jsx(o.Fragment,{children:h});const E=h.indexOf(u);if(E<0)return o.jsx(o.Fragment,{children:h});const F=h.slice(0,E),q=h.slice(E+u.length);return o.jsxs(o.Fragment,{children:[F,o.jsx("strong",{className:"tutorial-bubble-emphasis",children:u}),q]})});dt.displayName="TypingText";function _t({isOpen:s,onClose:h,onFinish:B,steps:u=null,robotImage:E=At,finalRobotImage:F=Nt,showAudioToggle:q=!1,onCloseDashboard:k=void 0}){const{user:c,updateUserMetadata:bt}=It(),S="bigkas_global_audio_muted_v1",O=r.useMemo(()=>[{id:"step-intro",title:"B-01:",text:"Before we jump in, let's do a quick walkthrough of how this works! Ready to get started?",button:"Continue",targetElementId:null},{id:"step-topic",title:"B-01:",text:"'The Topic' This is for your Verbal analysis! Focus on the prompt shown here to ensure your content is clear and stays on track.",button:"Continue",targetElementId:"tutorial-target-topic",emphasis:"'The Topic'"},{id:"step-camera",title:"B-01:",text:"'The Camera View' This is for your Visual analysis! Position yourself within the guide so I can accurately track your eye contact, expressions, and gestures. Also, make sure you're in a well-lit room so I can see you clearly—good lighting makes for a great performance!",button:"Next",targetElementId:"tutorial-target-camera",emphasis:"'The Camera View'"},{id:"step-soundbar",title:"B-01:",text:"'Voice Meter' This is for your Vocal analysis! Watch the soundbar dance as you speak to see your projection and emotional expression.",button:"Next",targetElementId:"tutorial-target-soundbar",emphasis:"'Voice Meter'"},{id:"step-controls",title:"B-01:",text:"'The Controls', Use Start to begin, Pause if you need a breather, or Restart to try the topic again from the top!",button:"Next",targetElementId:"tutorial-target-controls",emphasis:"'The Controls'"},{id:"step-final",title:"B-01:",text:"Controls mastered! Yay! Whenever you're ready, click Start so I can hear what you've got. I'm so excited to listen!",button:"BEGIN!",targetElementId:null}],[]),H=r.useMemo(()=>Array.isArray(u)&&u.length>0?u:O,[O,u]),V=r.useMemo(()=>!(Array.isArray(u)&&u.length>0),[u]),f=Array.isArray(u)&&u.length>0,[g,tt]=r.useState(0),[w,D]=r.useState(0),[ht,Y]=r.useState(""),[G,K]=r.useState(!1),[m,ft]=r.useState(()=>typeof window!="undefined"&&window.matchMedia("(max-width: 768px)").matches),[p,et]=r.useState(()=>typeof window=="undefined"?!1:c&&typeof c.isAudioMuted=="boolean"?c.isAudioMuted:window.localStorage.getItem(S)==="1"),[L,C]=r.useState(null);r.useEffect(()=>{if(typeof window=="undefined")return;const e=window.matchMedia("(max-width: 768px)"),i=()=>ft(e.matches);return typeof e.addEventListener=="function"?(e.addEventListener("change",i),()=>e.removeEventListener("change",i)):(e.addListener(i),()=>e.removeListener(i))},[]),r.useEffect(()=>{c&&typeof c.isAudioMuted=="boolean"&&et(c.isAudioMuted)},[c==null?void 0:c.isAudioMuted]);const n=r.useRef(null),rt=r.useRef(null),T=r.useRef([]),y=r.useRef(null),l=r.useRef(null),W=r.useRef(!1),X=r.useRef(!1),ot=r.useRef(p);r.useEffect(()=>{ot.current=p},[p]);const[I,Z]=r.useState(null),t=r.useMemo(()=>H[g],[H,g]),_=r.useMemo(()=>t!=null&&t.text?t.textPart2&&w===1?t.textPart2:m&&t.id==="step-streak"?Ft:t.text:"",[t,m,w]),J=r.useMemo(()=>{var e;return t?m&&t.id==="step-streak"?Vt:w===1&&t.voicePart2?t.voicePart2:w===1?null:(e=t.voice)!=null?e:null:null},[t,m,w]),it=r.useMemo(()=>t?t.robot||(t.id==="step-final"?F:E):E,[t,F,E]),gt=(t==null?void 0:t.id)==="step-intro"||(t==null?void 0:t.id)==="step-companion",A=!!(!f&&m&&(t==null?void 0:t.id)!=="step-final"||f&&((t==null?void 0:t.id)==="step-streak"||m&&!gt)),wt=r.useMemo(()=>A?mt:it,[A,it]),$=(t==null?void 0:t.targetElementId)==="tutorial-target-home-streak"||(t==null?void 0:t.targetElementId)==="tutorial-target-home-rank"||(t==null?void 0:t.targetElementId)==="tutorial-target-home-practice",at=(t==null?void 0:t.id)==="step-streak",Q=()=>{typeof document!="undefined"&&document.querySelectorAll(".tutorial-spotlight-active").forEach(e=>{e.classList.remove("tutorial-spotlight-active")})},P=()=>{T.current.forEach(e=>{e&&(e.pause(),e.currentTime=0)}),y.current&&(y.current.pause(),y.current.currentTime=0,y.current=null)},nt=(e,i="B-01 voice")=>{e&&(e.muted=!1,e.currentTime=0,e.onerror=()=>{console.warn(`[TutorialOverlayMobile] ${i} unavailable.`)},e.play().catch(a=>{console.warn(`[TutorialOverlayMobile] ${i} play failed:`,a)}))},xt=()=>{et(e=>{const i=!e;return typeof window!="undefined"&&window.localStorage.setItem(S,i?"1":"0"),c!=null&&c.id&&bt({is_audio_muted:i}).catch(()=>{}),i&&P(),i})};if(r.useEffect(()=>{if(!V){T.current=[];return}return T.current=[new Audio(Pt),new Audio(jt),new Audio(Mt),new Audio(Rt),new Audio(Bt),new Audio(Lt)],T.current.forEach(e=>{e&&(e.preload="none")}),()=>{P(),T.current=[]}},[V]),r.useEffect(()=>{T.current.forEach(e=>{e&&(e.muted=p,p&&(e.pause(),e.currentTime=0))}),y.current&&(y.current.muted=p,p&&(y.current.pause(),y.current.currentTime=0))},[p]),r.useEffect(()=>{if(s){X.current=!0,Q(),tt(0),D(0);return}X.current&&k&&f&&m&&k(),X.current=!1,Q(),P(),l.current&&(window.clearInterval(l.current),l.current=null),n.current&&(n.current.classList.remove("tutorial-spotlight-active"),n.current.style.removeProperty("pointer-events"),n.current=null)},[s,k,f,m]),r.useEffect(()=>{D(0)},[g]),r.useEffect(()=>{W.current=!1},[g]),r.useEffect(()=>{var j;if(!s||!t)return;const e=t.targetElementId;if(e!=="tutorial-target-home-streak"&&e!=="tutorial-target-home-rank"&&e!=="tutorial-target-home-practice"||typeof document=="undefined"||document.getElementById(e)||W.current)return;const i=document.querySelector(".activity-mobile-dashboard-section"),a=i==null?void 0:i.querySelector("button.activity-mobile-dashboard-btn"),d=(j=a==null?void 0:a.textContent)==null?void 0:j.trim().toLowerCase();a&&d==="dashboard"&&(a.click(),W.current=!0)},[s,t==null?void 0:t.id,t==null?void 0:t.targetElementId,g]),r.useEffect(()=>{if(!s||!t)return;Q(),n.current&&(n.current.classList.remove("tutorial-spotlight-active"),n.current.style.removeProperty("z-index"),n.current.style.removeProperty("pointer-events"),n.current=null);const e=t==null?void 0:t.targetElementId,i=f&&e==="tutorial-target-home-journey"?"4600":"4800",a=e==="tutorial-target-home-streak"||e==="tutorial-target-home-rank"||e==="tutorial-target-home-practice",d=e==="tutorial-target-home-streak"||e==="tutorial-target-home-rank"||e==="tutorial-target-home-practice",j=a?48:6,v=a?80:60;let M=!1,R=null;const z=(U=0)=>{if(M||!e)return;const x=document.getElementById(e);if(x){if(x.classList.add("tutorial-spotlight-active"),x.style.setProperty("z-index",i,"important"),d&&x.style.setProperty("pointer-events","none","important"),n.current=x,e==="tutorial-target-home-practice"){const b=document.querySelector(".dashboard-overlay-scroll-content")||document.querySelector(".dashboard-overlay-content");if(b){try{b.scrollTo({top:b.scrollHeight,behavior:"smooth"})}catch{b.scrollTop=b.scrollHeight}setTimeout(()=>{b&&(b.scrollTop=b.scrollHeight)},60)}}else if(e==="tutorial-target-home-journey")try{x.scrollIntoView({behavior:"smooth",block:"start"})}catch{}else try{x.scrollIntoView({behavior:"smooth",block:"center"})}catch{}return}U>=j||(R=window.setTimeout(()=>z(U+1),v))};return e&&z(0),()=>{M=!0,R&&window.clearTimeout(R),n.current&&(n.current.classList.remove("tutorial-spotlight-active"),n.current.style.removeProperty("z-index"),n.current.style.removeProperty("pointer-events"),n.current=null)}},[s,t==null?void 0:t.targetElementId,f]),r.useEffect(()=>{if(!s||(t==null?void 0:t.targetElementId)!=="tutorial-target-soundbar"){C(null);return}let e=0;const i=()=>{e=window.requestAnimationFrame(()=>{const a=document.getElementById("tutorial-target-soundbar");if(!a){C(null);return}const d=a.getBoundingClientRect();C({top:d.top,left:d.left,width:d.width,height:d.height})})};return i(),window.addEventListener("resize",i),window.addEventListener("scroll",i,!0),()=>{e&&window.cancelAnimationFrame(e),window.removeEventListener("resize",i),window.removeEventListener("scroll",i,!0),C(null)}},[s,t==null?void 0:t.targetElementId]),r.useEffect(()=>{!s||!m||!f||!k||(t==null?void 0:t.targetElementId)==="tutorial-target-home-journey"&&k()},[s,m,f,t==null?void 0:t.targetElementId,g,w,k]),r.useEffect(()=>{if(!s||!t){Z(null);return}if(!(!(!f&&m&&(t.id==="step-controls"||t.id==="step-soundbar"))&&(t.id==="step-controls"||t.id==="step-soundbar"||t.id==="step-roadmap"||t.id==="step-practice"))){Z(null);return}let a=0,d=0;const j=()=>{const M=t.targetElementId?document.getElementById(t.targetElementId):null,R=rt.current;if(!M||!R)return!1;const z=M.getBoundingClientRect(),U=R.getBoundingClientRect(),x=parseFloat(window.getComputedStyle(document.documentElement).fontSize)||16,b=t.id==="step-roadmap"?x:0,ct=x*2+b,vt=Math.max(8,z.top-U.height-ct);return Z({top:`${vt}px`,bottom:"auto",zIndex:5100}),!0},v=()=>{a=window.requestAnimationFrame(()=>{j()||(d=window.setTimeout(v,60))})};return v(),window.addEventListener("resize",v),window.addEventListener("orientationchange",v),()=>{a&&window.cancelAnimationFrame(a),d&&window.clearTimeout(d),window.removeEventListener("resize",v),window.removeEventListener("orientationchange",v)}},[s,t==null?void 0:t.id,t==null?void 0:t.targetElementId,w,f,m]),r.useEffect(()=>{if(!s||!t)return;Y(""),K(!1),l.current&&(window.clearInterval(l.current),l.current=null);let e=0;const i=_;if(l.current=window.setInterval(()=>{e+=1,Y(i.slice(0,e)),e>=i.length&&(l.current&&(window.clearInterval(l.current),l.current=null),K(!0))},12),!ot.current){if(P(),J){const a=new Audio(J);y.current=a,nt(a,"Custom voice")}else if(V){const a=T.current[g];a&&nt(a,`Tutorial voice ${g+1}`)}}return()=>{l.current&&(window.clearInterval(l.current),l.current=null),P()}},[g,s,V,t==null?void 0:t.id,_,J,w]),!s||!t)return null;const yt=()=>{if(P(),!G){Y(_),K(!0),l.current&&(window.clearInterval(l.current),l.current=null);return}if(t.textPart2&&w===0){D(1);return}if(g>=H.length-1){n.current&&(n.current.classList.remove("tutorial-spotlight-active"),n.current.style.removeProperty("z-index"),n.current.style.removeProperty("pointer-events"),n.current=null),B==null||B(),h==null||h();return}tt(i=>i+1)},st=`tutorial-overlay-wrapper${f?" is-custom-tutorial":" is-default-tutorial"}${(t==null?void 0:t.id)==="step-controls"?" is-controls-step":""}${(t==null?void 0:t.id)==="step-soundbar"?" is-soundbar-step":""}${(t==null?void 0:t.id)==="step-final"?" is-final-step":""}${(t==null?void 0:t.id)==="step-rank"?" is-rank-step":""}${t!=null&&t.robotClassName?` ${t.robotClassName}`:""}`,lt=o.jsx(o.Fragment,{children:o.jsxs("div",{className:"tutorial-companion-container",ref:rt,style:$?{...I!=null?I:{},pointerEvents:"auto"}:I!=null?I:void 0,children:[A?null:o.jsx("img",{src:wt,alt:"",className:"tutorial-robot-img","aria-hidden":"true"}),o.jsxs("article",{className:`tutorial-speech-bubble${A?" tutorial-speech-bubble--logo":""}`,children:[o.jsx("div",{className:`tutorial-bubble-title${A?" tutorial-bubble-title--with-brand":""}`,children:A?o.jsxs(o.Fragment,{children:[o.jsx("img",{src:mt,alt:"",className:"tutorial-bubble-title-logo",width:36,height:36}),o.jsx("span",{className:"tutorial-bubble-title-label",children:t.title})]}):t.title}),o.jsx("p",{className:"tutorial-bubble-text",children:o.jsx(dt,{text:ht,fullText:_,isDone:G,emphasis:w===0?t.emphasis:void 0})}),o.jsxs("div",{className:"tutorial-bubble-footer",children:[q&&o.jsx("button",{type:"button",onClick:xt,"aria-label":p?"Unmute B-01 voice":"Mute B-01 voice",title:p?"Unmute B-01 voice":"Mute B-01 voice",className:`tutorial-audio-toggle ${p?"is-muted":"is-unmuted"}`,children:p?o.jsx(Tt,{"aria-hidden":"true"}):o.jsx(kt,{"aria-hidden":"true"})}),o.jsx("button",{type:"button",className:"tutorial-bubble-btn",onClick:yt,disabled:!G,children:t.button})]})]})]})}),ut=$&&typeof document!="undefined"?Et.createPortal(o.jsxs(o.Fragment,{children:[at?o.jsx("div",{className:"bigkas-modal-scrim bigkas-modal-scrim--no-enter tutorial-mobile-streak-scrim","aria-hidden":"true",style:{position:"fixed",inset:0,zIndex:1800,pointerEvents:"none",background:"rgba(15, 23, 42, 0.5)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}):null,o.jsx("div",{className:st,style:{position:"fixed",inset:0,zIndex:7200,pointerEvents:"none"},"aria-label":"Training tutorial overlay",children:lt})]}),document.body):null;return o.jsxs(o.Fragment,{children:[s&&at?o.jsx("style",{children:`
          /*
           * Streak tutorial: scrim is portaled to document.body (z-index 1800). #root stacks as auto,
           * so the scrim paints above the whole app and hides the spotlight. Raise #root while this
           * step is open so dashboard content (including #tutorial-target-home-streak) stacks above the scrim.
           */
          #root {
            position: relative;
            z-index: 1850 !important;
          }
        `}):null,$?null:o.jsx("div",{className:"tutorial-dark-bg","aria-hidden":"true"}),L&&o.jsx("div",{className:"tutorial-soundbar-spotlight-clone","aria-hidden":"true",style:{top:`${L.top}px`,left:`${L.left}px`,width:`${L.width}px`,height:`${L.height}px`},children:o.jsx("div",{className:"tutorial-soundbar-preview-bars",children:Ct.map(e=>o.jsx("span",{style:{"--bar-index":e,"--bar-height":`${18+e%8*9}%`}},e))})}),o.jsx("style",{children:`
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
            z-index: 4800 !important;
            background: #ffffff !important;
            box-shadow: 0 0 0 5px #34D399, 0 0 42px rgba(52, 211, 153, 0.9) !important;
          }
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-content::after {
            content: '' !important;
            position: absolute !important;
            inset: 0 !important;
            z-index: 4700 !important;
            pointer-events: none !important;
            background: rgba(15, 23, 42, 0.5) !important;
            -webkit-backdrop-filter: blur(4px) !important;
            backdrop-filter: blur(4px) !important;
          }
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-scroll-content > *:not(.tutorial-spotlight-active),
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-header {
            pointer-events: none !important;
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
      `}),$&&ut?ut:o.jsx("section",{className:st,"aria-label":"Training tutorial overlay",children:lt})]})}const Gt=r.memo(_t);export{Gt as default};
