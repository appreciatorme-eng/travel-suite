import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:gobuddy_mobile/features/auth/presentation/screens/auth_screen.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('auth screen supports mode switch', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AuthScreen()));

    expect(find.text('Sign In'), findsOneWidget);

    final toggleFinder = find.text("Don't have an account? Sign up");
    await tester.ensureVisible(toggleFinder);
    await tester.tap(toggleFinder);
    await tester.pumpAndSettle();

    expect(find.text('Create Account'), findsOneWidget);
    expect(find.text('I am signing up as'), findsOneWidget);
  });
}
