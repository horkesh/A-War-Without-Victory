import copy
import importlib
import tempfile
from pathlib import Path
import unittest
import numpy as np

class RevisedCampaignChecks(unittest.TestCase):
    def setUp(self):
        self.s=importlib.import_module('create_campaign_suite_v2')
    def tone(self,decay=False):
        t=np.arange(96000)/48000
        a=np.sin(2*np.pi*220*t)*np.minimum(1,t/.08)
        if decay:a*=np.exp(-t*3)
        return np.column_stack((a,a)).astype(np.float32)
    def test_held_recording_extends_with_continuous_body_and_clean_joins(self):
        a,meta=self.s.sustain_body(self.tone(),8,57)
        self.assertEqual(len(a),8*48000)
        self.assertGreater(np.sqrt(np.mean(a[-48000:]**2)),.5)
        self.assertLess(np.max(np.abs(np.diff(a[:,0]))),.06)
        self.assertGreater(meta['loop_crossfade_seconds'],.03)
    def test_phrase_tie_crosses_bar_without_restart(self):
        e=dict(track='cello',duration=7.,midi=57,velocity=64,articulation='legato',release=.8)
        a,meta=self.s.articulate(self.tone(),e)
        for second in (2.,4.,6.):
            chunk=a[int((second-.02)*48000):int((second+.02)*48000)]
            self.assertGreater(np.sqrt(np.mean(chunk**2)),.4)
        self.assertEqual(float(np.max(np.abs(a[-1]))),0)
        self.assertLess(np.sqrt(np.mean(a[-2400:]**2)),.05)
    def test_natural_piano_and_harp_never_loop(self):
        for inst in ('piano','harp'):
            a,m=self.s.articulate(self.tone(True),dict(track=inst,duration=8.,midi=57,velocity=60,articulation='natural',release=1.))
            self.assertLessEqual(len(a),96000)
            self.assertFalse(m['looped'])
            self.assertLess(np.sqrt(np.mean(a[-4800:]**2)),.01)
    def test_complete_distinct_authored_scores_and_real_ties(self):
        suite=self.s.validate_suite([self.s.composition(k) for k in self.s.TRACKS])
        self.assertEqual(len(suite),8)
        self.assertGreater(len({round(s['duration_seconds']) for s in suite}),5)
        for score in suite:
            self.assertTrue(180<=score['duration_seconds']<=240)
            self.assertGreaterEqual(len(score['sections']),5)
            self.assertTrue(any(n['time']<b<n['time']+n['duration'] for n in score['notes'] for b in score['bar_starts'][1:-1]))
    def test_bad_score_and_range_rejected(self):
        for field,value in [('time',-1),('duration',0),('midi',110),('velocity',128),('time',float('nan'))]:
            score=self.s.composition('country');score['notes'][0][field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):self.s.validate(score)
    def test_duplicate_transposition_and_missing_tracks_rejected(self):
        suite=[self.s.composition(k) for k in self.s.TRACKS]
        with self.assertRaises(ValueError):self.s.validate_suite(suite[:7])
        suite[1]['theme']=[x+2 for x in suite[0]['theme']]
        with self.assertRaises(ValueError):self.s.validate_suite(suite)
    def test_fresh_attempt_is_scoped_and_never_overwrites(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(ValueError):self.s.fresh_output(Path(temp)/'bad')
        with self.assertRaises(ValueError):self.s.fresh_output(self.s.HOME/'sample-cache'/'bad')
        with self.assertRaises(FileExistsError):self.s.fresh_output(self.s.HOME)

if __name__=='__main__':unittest.main()
