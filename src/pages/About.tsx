import Layout from '../components/Layout';
import { Info, ShieldCheck, Zap, Globe } from 'lucide-react';

export default function About() {
  return (
    <Layout>
      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <Info size={40} color="#000" />
          <h1 style={{ fontSize: '48px', fontWeight: '800', margin: 0, letterSpacing: '-2px' }}>About Kaptan</h1>
        </div>

        <section style={{ marginBottom: '48px' }}>
          <p style={{ fontSize: '20px', lineHeight: '1.6', color: '#333' }}>
            Kaptan is a next-generation Business Management System (BMS) designed to simplify complex enterprise workflows. 
            Moving away from traditional, bulky ERP systems, Kaptan offers a modular, AI-first approach to managing supply chains, 
            customer relations, finance, production, and human resources.
          </p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '48px' }}>
          <div style={{ padding: '24px', border: '2px solid #000', borderRadius: '0' }}>
            <Zap size={24} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Efficiency First</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Minimalist UI/UX designed for rapid data entry and clear visualization. No clutter, just performance.
            </p>
          </div>
          <div style={{ padding: '24px', border: '2px solid #000', borderRadius: '0' }}>
            <ShieldCheck size={24} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Multi-tenant Security</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Enterprise-grade isolation for your company data using state-of-the-art Firestore security rules.
            </p>
          </div>
          <div style={{ padding: '24px', border: '2px solid #000', borderRadius: '0' }}>
            <Globe size={24} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Global Compliance</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Support for multi-currency transactions and local regulations including Turkish e-transformation standards.
            </p>
          </div>
          <div style={{ padding: '24px', border: '2px solid #000', borderRadius: '0' }}>
            <Info size={24} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>AI Integration</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Harnessing the power of GPT-4o Mini for autonomous reporting, forecasting, and data reconciliation.
            </p>
          </div>
        </div>

        <section style={{ padding: '32px', background: '#f9f9f9', borderLeft: '4px solid #000' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>Our Mission</h2>
          <p style={{ fontSize: '16px', lineHeight: '1.5', margin: 0 }}>
            Our mission is to empower small to medium enterprises with the tools they need to compete in a digital world. 
            By providing a transparent, flexible, and intelligent platform, we help businesses transition from spreadsheets 
            to a unified source of truth.
          </p>
        </section>

        <footer style={{ marginTop: '64px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
          © 2025 Kaptan BMS. All rights reserved. Version 2.4.0
        </footer>
      </div>
    </Layout>
  );
}

