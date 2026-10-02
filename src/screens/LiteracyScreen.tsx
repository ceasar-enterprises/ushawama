import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar, LevelBadge } from '../components/ProgressBar';
import { VoiceButton } from '../components/VoiceButton';

type Props = { navigation: any };

const LEVELS = [
  {
    id: 1,
    name: 'Jina Langu',
    nameEn: 'My Name',
    hours: 20,
    lessons: [
      { id: 'l1w1', title: 'My Name', activities: 5, completed: true },
      { id: 'l1w2', title: 'My Phone Number', activities: 4, completed: true },
      { id: 'l1w3', title: 'My Village', activities: 4, completed: false },
    ],
  },
  {
    id: 2,
    name: 'Bei ya Bidhaa',
    nameEn: 'Product Price',
    hours: 40,
    lessons: [
      { id: 'l2w1', title: 'Numbers and Money', activities: 4, completed: true },
      { id: 'l2w2', title: 'Reading Receipts', activities: 3, completed: true },
      { id: 'l2w3', title: 'Product Names', activities: 3, completed: false },
    ],
  },
  {
    id: 3,
    name: 'Fomu ya Forodha',
    nameEn: 'Customs Form',
    hours: 60,
    lessons: [
      { id: 'l3w1', title: 'What is Customs?', activities: 3, completed: false },
      { id: 'l3w2', title: 'Reading a Declaration Form', activities: 3, completed: false },
    ],
  },
  {
    id: 4,
    name: 'Soko',
    nameEn: 'Market',
    hours: 80,
    lessons: [
      { id: 'l4w1', title: 'Market Signs', activities: 3, completed: false },
    ],
  },
  {
    id: 5,
    name: 'Biashara Yangu',
    nameEn: 'My Business',
    hours: 60,
    lessons: [
      { id: 'l5w1', title: 'Writing Receipts', activities: 3, completed: false },
    ],
  },
];

const LEVEL_COLORS = [Colors.level1, Colors.level2, Colors.level3, Colors.level4, Colors.level5];

export default function LiteracyScreen({ navigation }: Props) {
  const [expandedLevel, setExpandedLevel] = useState(2);
  const currentLevel = 2;
  const totalHours = 12;

  const totalLessons = LEVELS.reduce((a, l) => a + l.lessons.length, 0);
  const completedLessons = LEVELS.reduce(
    (a, l) => a + l.lessons.filter(l2 => l2.completed).length,
    0,
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* ─── Progress Header ─── */}
      <Card variant="elevated" accentColor={Colors.primary}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Reading Journey</Text>
          <Text style={styles.headerSub}>Learn to read through your trade</Text>
        </View>

        <View style={styles.statsRow}>
          <StatBox label="Hours" value={`${totalHours}`} unit="hrs" />
          <StatBox label="Lessons" value={`${completedLessons}/${totalLessons}`} />
          <StatBox label="Level" value={`${currentLevel}/5`} />
          <StatBox label="Words" value="47" />
        </View>

        <ProgressBar
          progress={(completedLessons / totalLessons) * 100}
          color={Colors.primary}
          label={`${completedLessons} of ${totalLessons} lessons completed`}
        />

        <View style={styles.badgesRow}>
          {LEVELS.map((l, i) => (
            <View key={l.id} style={styles.badgeWrap}>
              <LevelBadge level={l.id} size="md" completed={i + 1 < currentLevel} />
              <Text style={styles.badgeLabel}>{l.nameEn}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* ─── Next Lesson CTA ─── */}
      <Card variant="filled" accentColor={Colors.secondary}>
        <View style={styles.nextLesson}>
          <Text style={styles.nextLabel}>Up next:</Text>
          <Text style={styles.nextTitle}>Product Names</Text>
          <Text style={styles.nextLevel}>Level 2: Bei ya Bidhaa · 3 activities · ~15 min</Text>
          <Button
            title="Start Lesson"
            onPress={() => Alert.alert('Starting lesson...')}
            size="lg"
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </Card>

      {/* ─── Levels ─── */}
      <Text style={styles.sectionTitle}>All Levels</Text>
      {LEVELS.map((level, idx) => {
        const levelCompleted = level.lessons.every(l => l.completed);
        const levelStarted = level.lessons.some(l => l.completed);
        const isExpanded = expandedLevel === level.id;
        const color = LEVEL_COLORS[idx];

        return (
          <TouchableOpacity
            key={level.id}
            onPress={() => setExpandedLevel(isExpanded ? 0 : level.id)}
            activeOpacity={0.8}
          >
            <Card variant="elevated" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
              <View style={styles.levelHeader}>
                <LevelBadge level={level.id} size="lg" completed={levelCompleted} />
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={styles.levelName}>{level.name}</Text>
                  <Text style={styles.levelNameEn}>{level.nameEn} · {level.hours}h</Text>
                </View>
                <Text style={styles.expandIcon}>{isExpanded ? '▾' : '▸'}</Text>
              </View>

              {isExpanded && (
                <View style={styles.lessonList}>
                  <ProgressBar
                    progress={
                      (level.lessons.filter(l => l.completed).length / level.lessons.length) * 100
                    }
                    color={color}
                    height={6}
                    showPercent={false}
                    style={{ marginTop: Spacing.md }}
                  />
                  {level.lessons.map(lesson => (
                    <TouchableOpacity
                      key={lesson.id}
                      style={[styles.lessonRow, lesson.completed && styles.lessonCompleted]}
                      onPress={() =>
                        Alert.alert('Lesson', `${lesson.title}\n${lesson.activities} activities`)
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.lessonCheck}>
                        {lesson.completed ? (
                          <View style={styles.checkDone} />
                        ) : (
                          <View style={styles.checkOpen} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lessonTitle}>{lesson.title}</Text>
                        <Text style={styles.lessonMeta}>{lesson.activities} activities</Text>
                      </View>
                      {!lesson.completed && level.id === currentLevel && (
                        <VoiceButton variant="speak" size="sm" text={`Start ${lesson.title}`} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>
          </TouchableOpacity>
        );
      })}

      {/* ─── Vocabulary Preview ─── */}
      <Text style={styles.sectionTitle}>Words I Know</Text>
      <Card variant="outlined">
        <View style={styles.wordCloud}>
          {['maize', 'beans', 'rice', 'coffee', 'fish', 'price', 'receipt', 'name', 'phone', 'village', 'customs', 'duty'].map(
            word => (
              <View key={word} style={styles.wordChip}>
                <Text style={styles.wordText}>{word}</Text>
              </View>
            ),
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

function StatBox({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>
        {label}
        {unit ? ` (${unit})` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },

  header: { marginBottom: Spacing.md },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  badgeWrap: { alignItems: 'center' },
  badgeLabel: { fontSize: 9, color: Colors.textMuted, marginTop: Spacing.xs, fontWeight: '500' },

  nextLesson: {},
  nextLabel: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  nextTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  nextLevel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },

  levelHeader: { flexDirection: 'row', alignItems: 'center' },
  levelName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  levelNameEn: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  expandIcon: { fontSize: FontSize.xl, color: Colors.textMuted },

  lessonList: { marginTop: Spacing.sm },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  lessonCompleted: { opacity: 0.6 },
  lessonCheck: { width: 28, alignItems: 'center', justifyContent: 'center' },
  checkDone: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.success },
  checkOpen: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.border },
  lessonTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  lessonMeta: { fontSize: FontSize.xs, color: Colors.textMuted },

  wordCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  wordChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  wordText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
});
