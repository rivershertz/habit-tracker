import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useState } from 'react';
import { StoreProvider, useStore } from '../store/store';
import { Celebrations, FloatLayer } from './Celebrations';
import { Detail } from './Detail';
import { Journey } from './Journey';
import { Onboarding } from './Onboarding';
import { TabBar, type Tab } from './TabBar';
import { Today, type DetailId } from './Today';
import { TopBar } from './TopBar';

function Shell() {
  const { onboarded, persisted } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [detail, setDetail] = useState<DetailId | null>(null);

  if (!onboarded) return <Onboarding />;

  return (
    <div className="app">
      <TopBar onOpenJourney={() => setTab('journey')} />
      {!persisted && (
        <p className="banner">Heads up: this browser is blocking storage, so progress won't be saved after you close the tab.</p>
      )}
      <main className="content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'today' ? <Today onOpen={setDetail} /> : <Journey />}
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar tab={tab} onChange={setTab} />
      <AnimatePresence>{detail && <Detail key={detail} id={detail} onClose={() => setDetail(null)} />}</AnimatePresence>
      <Celebrations />
    </div>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <Shell />
        <FloatLayer />
      </StoreProvider>
    </MotionConfig>
  );
}
