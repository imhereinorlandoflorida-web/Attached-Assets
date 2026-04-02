import { Feather } from "@expo/vector-icons";
import {
  useGetDashboardSummary,
  useGetRecentActivity,
  useGetSignalWeights,
} from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const HERO = require("../../assets/images/hero.jpeg");

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Feather
        name={icon as any}
        size={18}
        color={accent ?? colors.primary}
        style={styles.statIcon}
      />
      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function WeightBar({
  category,
  percentage,
  avgWeight,
}: {
  category: string;
  percentage: number;
  avgWeight: number;
}) {
  const colors = useColors();
  const catColors: Record<string, string> = {
    behavioral: colors.primary,
    semantic: colors.secondary,
    temporal: colors.accent,
    contextual: "#10b981",
  };
  const barColor = catColors[category] ?? colors.primary;

  return (
    <View style={styles.weightRow}>
      <Text style={[styles.weightLabel, { color: colors.mutedForeground }]}>
        {category}
      </Text>
      <View style={[styles.weightTrack, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.weightFill,
            { backgroundColor: barColor, width: `${percentage}%` as any },
          ]}
        />
      </View>
      <Text style={[styles.weightPct, { color: colors.foreground }]}>
        {(avgWeight * 100).toFixed(0)}%
      </Text>
    </View>
  );
}

function ActivityRow({
  item,
}: {
  item: {
    id: number;
    type: string;
    description: string;
    sessionName: string;
    createdAt: string;
  };
}) {
  const colors = useColors();
  const typeIcons: Record<string, string> = {
    signal: "zap",
    path: "git-branch",
    feedback: "thumbs-up",
    session: "cpu",
  };
  const icon = typeIcons[item.type] ?? "activity";

  return (
    <View style={[styles.activityRow, { borderBottomColor: colors.border }]}>
      <Feather
        name={icon as any}
        size={14}
        color={colors.primary}
        style={styles.activityIcon}
      />
      <View style={styles.activityContent}>
        <Text
          style={[styles.activityDesc, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {item.description}
        </Text>
        <Text style={[styles.activityMeta, { color: colors.mutedForeground }]}>
          {item.sessionName} ·{" "}
          {new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useGetDashboardSummary();
  const {
    data: activity,
    isLoading: loadingActivity,
    refetch: refetchActivity,
  } = useGetRecentActivity();
  const {
    data: weights,
    isLoading: loadingWeights,
    refetch: refetchWeights,
  } = useGetSignalWeights();

  const isLoading = loadingSummary || loadingActivity || loadingWeights;
  const onRefresh = () => {
    refetchSummary();
    refetchActivity();
    refetchWeights();
  };

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100),
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.hero, { paddingTop: topPad + insets.top }]}>
        <Image
          source={HERO}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(9,9,15,0.72)" },
          ]}
        />
        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>ADAPTIVE PATH INTELLIGENCE</Text>
          <Text style={styles.heroTitle}>Sentinel</Text>
          <Text style={styles.heroSub}>
            Signal routing · Inference · Adaptation
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {loadingSummary ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              label="Sessions"
              value={summary?.totalSessions ?? 0}
              icon="cpu"
            />
            <StatCard
              label="Active"
              value={summary?.activeSessions ?? 0}
              icon="activity"
              accent={colors.accent}
            />
            <StatCard
              label="Signals"
              value={summary?.totalSignals ?? 0}
              icon="zap"
              accent={colors.secondary}
            />
            <StatCard
              label="Paths"
              value={summary?.totalPaths ?? 0}
              icon="git-branch"
              accent="#10b981"
            />
          </View>
        )}

        {summary && (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.card,
                borderColor: colors.primary + "33",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              Avg Adaptation
            </Text>
            <Text style={[styles.bigStat, { color: colors.primary }]}>
              {(summary.avgAdaptationScore * 100).toFixed(1)}%
            </Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              top category:{" "}
              <Text style={{ color: colors.foreground }}>{summary.topCategory}</Text>
            </Text>
          </View>
        )}

        <Text style={[styles.sectionHeader, { color: colors.foreground }]}>
          Signal Weights
        </Text>
        {loadingWeights ? (
          <ActivityIndicator color={colors.primary} />
        ) : weights && weights.length > 0 ? (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            {weights.map((w) => (
              <WeightBar
                key={w.category}
                category={w.category}
                percentage={w.percentage}
                avgWeight={w.avgWeight}
              />
            ))}
          </View>
        ) : (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No signal data yet
          </Text>
        )}

        <Text style={[styles.sectionHeader, { color: colors.foreground }]}>
          Recent Activity
        </Text>
        {loadingActivity ? (
          <ActivityIndicator color={colors.primary} />
        ) : activity && activity.length > 0 ? (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <FlatList
              data={activity.slice(0, 15)}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <ActivityRow item={item} />}
              scrollEnabled={false}
            />
          </View>
        ) : (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No activity yet
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  hero: {
    height: 280,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroContent: { padding: 20, paddingBottom: 24 },
  heroEyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#0dd4f0",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "700" as const,
    color: "#fafafa",
    marginBottom: 4,
  },
  heroSub: { fontSize: 13, color: "rgba(250,250,250,0.55)" },
  body: { padding: 16 },
  loader: { marginVertical: 24 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: "44%",
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  statIcon: { marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: "700" as const },
  statLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  section: { padding: 14, marginBottom: 16, borderWidth: 1 },
  sectionTitle: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 4,
  },
  bigStat: { fontSize: 40, fontWeight: "700" as const },
  sectionSub: { fontSize: 12 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600" as const,
    marginBottom: 10,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  weightRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  weightLabel: { width: 80, fontSize: 12 },
  weightTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  weightFill: { height: "100%", borderRadius: 2 },
  weightPct: { width: 36, fontSize: 12, textAlign: "right" as const },
  activityRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: "flex-start",
  },
  activityIcon: { marginRight: 10, marginTop: 2 },
  activityContent: { flex: 1 },
  activityDesc: { fontSize: 13 },
  activityMeta: { fontSize: 11, marginTop: 2 },
  empty: { fontSize: 13, textAlign: "center" as const, marginVertical: 16 },
});
