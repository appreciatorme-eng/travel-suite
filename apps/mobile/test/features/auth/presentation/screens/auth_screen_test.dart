import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gobuddy_mobile/features/auth/presentation/screens/auth_screen.dart';

void main() {
  Widget buildSubject() {
    return const MaterialApp(home: AuthScreen());
  }

  testWidgets('renders login mode by default', (tester) async {
    await tester.pumpWidget(buildSubject());

    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text("Don't have an account? Sign up"), findsOneWidget);
    expect(find.text('I am signing up as'), findsNothing);
  });

  testWidgets('shows driver onboarding hint when driver role is selected', (
    tester,
  ) async {
    await tester.pumpWidget(buildSubject());

    final toggleFinder = find.text("Don't have an account? Sign up");
    await tester.ensureVisible(toggleFinder);
    await tester.tap(toggleFinder);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Driver'));
    await tester.pumpAndSettle();

    expect(
      find.textContaining('Driver accounts must be linked by admin'),
      findsOneWidget,
    );
  });

  testWidgets('shows role selection in signup mode', (tester) async {
    await tester.pumpWidget(buildSubject());

    final toggleFinder = find.text("Don't have an account? Sign up");
    await tester.ensureVisible(toggleFinder);
    await tester.tap(toggleFinder);
    await tester.pumpAndSettle();

    expect(find.text('Create Account'), findsOneWidget);
    expect(find.text('I am signing up as'), findsOneWidget);
    expect(find.text('Client'), findsOneWidget);
    expect(find.text('Driver'), findsOneWidget);
  });
}
