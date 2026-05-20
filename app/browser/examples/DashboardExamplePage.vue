<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import DashboardExample from './DashboardExample.vue'
import source from './DashboardExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-dashboard" title="Dashboard" :source="source">
		<DashboardExample />
	</ExamplesShell>
</template>
