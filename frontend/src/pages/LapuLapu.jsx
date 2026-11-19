import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { Ceb, MuralArt, Sunburst } from '../components/Story.jsx';
import mactanSvg from '../art/mactan.svg?raw';

// A fixed feature page. Every historical statement here is a well-documented fact; the
// numbers come from Antonio Pigafetta, who sailed with the expedition and wrote it down.
export default function LapuLapu() {
  const { user } = useAuth();
  const [paused, setPaused] = useState(false);
  const canWrite = user && ['author', 'admin'].includes(user.role);

  return (
    <div className="feature">
      <Link to="/" className="back" viewTransition><Ceb className="">Balik</Ceb> · Back to all stories</Link>

      <figure>
        <div className={`scene${paused ? ' is-paused' : ''}`} style={{ viewTransitionName: 'mural-hero' }}>
          <span role="img" aria-label="Art Deco panorama of the Battle of Mactan: Lapu-Lapu raises his kampilan on the shore with his warriors while Magellan's soldiers wade back to their boats and ships.">
            <MuralArt svg={mactanSvg} />
          </span>
        </div>
        <div className="scene-controls">
          <button type="button" className="button small" aria-pressed={paused} onClick={() => setPaused(p => !p)}>
            {paused ? 'Play motion' : 'Pause motion'}
          </button>
        </div>
        <figcaption>The shore of Mactan, 27 April 1521. An original Art Deco illustration; no portrait of Lapu-Lapu survives.</figcaption>
      </figure>

      <article className="article">
        <header>
          <Sunburst />
          <p className="label" style={{ color: 'var(--gold-text)', margin: 0 }}><Ceb className="">Ang sugilanon ni Lapu-Lapu</Ceb> · A Sugilanon feature</p>
          <h1>Lapu-Lapu of Mactan</h1>
          <div className="byline"><p className="meta">The chief who held the shore · 27 April 1521 · 2 min read</p></div>
        </header>

        <div className="prose">
          <p>
            In March 1521 a fleet sailing for the Spanish crown, led by the Portuguese navigator Ferdinand Magellan,
            reached the islands we now call the Philippines. In April it anchored at Cebu, where Rajah Humabon made an
            alliance with Magellan, and he and many of his people were baptized.
          </p>

          <h2><Ceb>Usa ka datu nga midumili</Ceb>A chief who refused</h2>
          <p>
            Across the narrow strait, on the island of Mactan, one chief would not submit. Lapu-Lapu refused to accept
            the newcomers' authority or send them tribute. Magellan decided to make an example of him.
          </p>

          <h2><Ceb>Ang gubat sa baybayon</Ceb>The battle on the shore</h2>
          <p>
            Before dawn on 27 April 1521, Magellan crossed to Mactan. The reef kept his boats far from land, so his men
            had to wade ashore. Pigafetta counted 49 of them going into the water, facing about 1,500 warriors on the
            beach. The fight went against the Europeans. Magellan was killed in the shallows, and the survivors fell
            back to their boats. The fleet left Cebu soon after.
          </p>

          <h2><Ceb>Ngano nga usa kini ka sugilanon</Ceb>Why this is a sugilanon</h2>
          <p>
            Lapu-Lapu left no writing of his own. We know his story because others told it: first Pigafetta in his
            account of the voyage, then five centuries of tellers in Cebu and across the islands. That is what
            <em> sugilanon</em> means in Bisaya: a story carried from one voice to the next, kept alive by being told.
          </p>
          <p>
            He is still being told today. April 27 is observed in the Philippines as Lapu-Lapu Day, and the city on
            Mactan carries his name. This blog borrows its name from the same idea: every post here is a small
            sugilanon, and it lasts as long as someone reads it.
          </p>
        </div>

        <p className="sources">
          Source: Antonio Pigafetta, who sailed with Magellan and wrote the first-hand account of the voyage, including the
          numbers above. The illustration is an original Art Deco interpretation, not a portrait.
        </p>

        <div className="closing">
          <Sunburst />
          <p className="label" style={{ color: 'var(--gold-text)', margin: 0 }}><Ceb className="">Isugilon ang imoha</Ceb> · Tell yours</p>
          <Link to={canWrite ? '/new' : '/'} className="button primary" viewTransition>
            {canWrite ? 'Write a story' : 'Read the latest stories'}
          </Link>
        </div>
      </article>
    </div>
  );
}
