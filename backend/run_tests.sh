#!/bin/bash

# GrowthLog Test Stress-Tester
# Usage: ./run_tests.sh <number_of_runs>

NUM_RUNS=${1:-1}
PASSED_RUNS=0
FAILED_RUNS=0

echo "🚀 Starting $NUM_RUNS iterations of the backend test suite..."
echo "----------------------------------------------------------"

for ((i=1; i<=NUM_RUNS; i++))
do
    echo "🔄 Iteration $i/$NUM_RUNS..."
    
    # Run pytest with -v (verbose) and -s (show output/logs)
    python3 -m pytest tests -v -s
    
    if [ $? -eq 0 ]; then
        ((PASSED_RUNS++))
        echo "✅ Iteration $i passed."
    else
        ((FAILED_RUNS++))
        echo "❌ Iteration $i FAILED."
        # Optional: exit on first failure
        # exit 1 
    fi
    echo "---------------------------"
done

echo ""
echo "📊 Test Summary Over $NUM_RUNS Runs:"
echo "✅ Passed: $PASSED_RUNS"
echo "❌ Failed: $FAILED_RUNS"

if [ $FAILED_RUNS -eq 0 ]; then
    echo "✨ All runs were stable!"
    exit 0
else
    echo "⚠️  Found flaky tests. Review the logs above."
    exit 1
fi
