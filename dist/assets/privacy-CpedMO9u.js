import{j as e,A as c,m as o}from"./vendor-motion-CY3_zbz2.js";import"./vendor-framework-gCbw6FxD.js";import{u as t}from"./styled-components.browser.esm-DWO9IDTp.js";const l=t(o.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  /* Premium Centering: Offset by sidebar width to center in content area */
  padding-left: calc(280px + 20px);

  @media (max-width: 1100px) {
    padding-left: 20px;
  }
`,d=t(o.div)`
  background: #ffffff;
  width: 100%;
  max-width: 550px;
  max-height: 85vh;
  border-radius: 24px;
  border: 3px solid #10B981;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
`,p=t.div`
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  text-align: center;
`,u=t.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #0b3954;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`,h=t.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #444;
  white-space: pre-wrap;
  background: #fafafa;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
`,y=t.div`
  padding: 16px 24px 24px;
  display: flex;
  justify-content: center;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
`,f=t.button`
  background-color: #10B981;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 40px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: pointer;
  box-shadow: #059669 0 6px 0 0;
  transition: all 0.1s ease;
  text-transform: uppercase;

  &:hover {
    transform: translateY(1px);
    box-shadow: #059669 0 5px 0 0;
  }

  &:active {
    transform: translateY(6px);
    box-shadow: #059669 0 0px 0 0;
    transition: 100ms;
  }
`,g=({isOpen:i,onClose:a,title:r,content:n})=>e.jsx(c,{children:i&&e.jsx(l,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:a,children:e.jsxs(d,{initial:{scale:.9,opacity:0,y:20},animate:{scale:1,opacity:1,y:0},exit:{scale:.9,opacity:0,y:20},onClick:s=>s.stopPropagation(),children:[e.jsx(p,{children:e.jsx(u,{children:r})}),e.jsx(h,{children:n}),e.jsx(y,{children:e.jsx(f,{onClick:a,children:"Close"})})]})})}),x=Object.freeze(Object.defineProperty({__proto__:null,default:g},Symbol.toStringTag,{value:"Module"})),v=`
BIGKAS TERMS AND CONDITIONS
TERMS AND CONDITIONS

Last Updated: April 12, 2026

1. ACCEPTANCE OF TERMS
By accessing and using Bigkas (the "Application"), you agree to comply with and be bound by these Terms and Conditions, all applicable laws, and regulations in the Republic of the Philippines. If you do not agree with these terms, you are prohibited from using this Application.

2. DATA PRIVACY AND BIOMETRIC PROCESSING
In compliance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012 (DPA):
a. Biometric Analysis: The Application utilizes MediaPipe for facial landmark detection and Librosa for acoustic voice analysis to provide speaking coach feedback.
b. Consent: By utilizing the recording features, you grant explicit consent for the Application to process your face and voice data for real-time analysis.
c. Data Retention: To ensure user security and privacy, all sensitive biometric recordings and session-specific data are subject to an automatic deletion policy after fourteen (14) days.
d. Rights of the Data Subject: You maintain the right to access, object to processing, and request the erasure of your data as provided under Philippine law.

3. INTELLECTUAL PROPERTY RIGHTS
The Application, including its source code, UI/UX design (specifically the "Skyward Journey" skill tree architecture), logos, and AI-driven methodologies, are the intellectual property of the developers. Users are granted a limited, non-transferable license for personal, educational use only.

4. USER OBLIGATIONS AND CONDUCT
Users agree not to:
a. Attempt to reverse engineer, decompile, or extract the underlying logic of the MediaPipe and Librosa integrations.
b. Use the Application to record or upload content that violates the Cybercrime Prevention Act of 2012 (R.A. 10175) or other applicable local laws.
c. Interfere with the security features of the Application or its cloud-based hosting services.

5. LIMITATION OF LIABILITY
Bigkas is an educational tool provided on an "as-is" basis. While the developers strive for high-fidelity feedback through AI modeling, we do not guarantee 100% accuracy in speaking assessments. The developers shall not be liable for any perceived lack of progress or data loss resulting from the 14-day auto-deletion security protocol.

6. TERMINATION
We reserve the right to terminate or suspend access to our Application immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.

7. GOVERNING LAW
These Terms shall be governed and construed in accordance with the laws of the Republic of the Philippines. Any legal action arising from the use of this Application shall be filed in the competent courts of the Philippines.

8. CONTACT INFORMATION
For questions regarding these Terms or your data privacy rights, please contact the Bigkas Development Team.
`,T=`
BIGKAS PRIVACY POLICY
PRIVACY POLICY

Last Updated: April 12, 2026

1. INTRODUCTION
Bigkas is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information in accordance with Republic Act No. 10173, also known as the Data Privacy Act of 2012 (DPA) of the Philippines.

2. INFORMATION WE COLLECT
To provide our AI-driven speaking coach services, we process the following types of data:
a. Biometric Information: We use MediaPipe to process facial landmark coordinates (Visual Presence) and Librosa to analyze acoustic vocal features (Vocal Clarity).
b. Account Data: Basic profile information such as your name and email address provided during registration.
c. Performance Data: Scores and progress metrics related to your "Skyward Journey" stages.

3. HOW WE PROCESS YOUR BIOMETRIC DATA
a. Real-Time Analysis: Facial and voice processing occurs to provide immediate feedback on your speaking performance.
b. Local vs. Server Processing: Depending on the session type, data may be processed locally on your device or temporarily uploaded to our secured Supabase servers for deeper analysis.
c. Non-Identification: We process biometric 'features' rather than raw 'identities.' Our goal is to analyze the quality of speech and movement, not to identify the user for external purposes.

4. DATA RETENTION AND DELETION
In line with our commitment to data minimization and security:
a. 14-Day Auto-Deletion: All raw audio recordings and facial landmark data are subject to a mandatory automatic deletion policy after fourteen (14) days.
b. Persistent Data: Only high-level progress metrics (e.g., Stage completion, total scores) are retained indefinitely to maintain your user history.

5. DATA SHARING AND DISCLOSURE
We do not sell, trade, or rent your biometric data to third parties. Data is only shared with:
a. Service Providers: Secured infrastructure providers (e.g., Supabase) who are bound by strict confidentiality agreements.
b. Legal Requirements: If required by Philippine law or a valid government request under the DPA.

6. SECURITY MEASURES
We implement industry-standard organizational, physical, and technical security measures to protect your data from unauthorized access, alteration, or disclosure. This includes encryption and strict access controls to the database.

7. YOUR RIGHTS AS A DATA SUBJECT
Under the Data Privacy Act of 2012, you have the right to:
- Be informed that your data is being processed.
- Access your stored data.
- Object to processing or withdraw consent.
- Request erasure or blocking of your data (Right to Erasure).

8. CHANGES TO THIS POLICY
We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.

9. CONTACT US
If you have questions about this Privacy Policy or wish to exercise your rights, please contact the Bigkas Development Team.
`;export{g as L,T as P,v as T,x as a};
//# sourceMappingURL=privacy-CpedMO9u.js.map
