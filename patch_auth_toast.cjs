const fs = require('fs');
const file = 'src/pages/Auth.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetLogin = `          } else {
            toast({
              title: t('errors.auth'),
              description: error.message,
              variant: 'destructive',
            });
          }`;

const replaceLogin = `          } else if (error.message.startsWith('NETWORK_ERROR:')) {
            toast({
              title: t('errors.network'),
              description: 'Unable to connect to the authentication server. Please check your internet connection and try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('errors.auth'),
              description: error.message,
              variant: 'destructive',
            });
          }`;

const targetSignup = `          } else {
            toast({
              title: t('errors.auth'),
              description: error.message,
              variant: 'destructive',
            });
          }`;

// The replacement logic needs to be careful because we have multiple identical strings
// We'll replace the first one (login), then the second one (signup).
// Let's use a replacer function to keep track of the index
let count = 0;
code = code.replace(/          \} else \{\n            toast\(\{\n              title: t\('errors\.auth'\),\n              description: error\.message,\n              variant: 'destructive',\n            \}\);\n          \}/g, (match) => {
  count++;
  if (count <= 2) {
    return replaceLogin;
  }
  return match;
});

// For handleGoogleSignIn
const targetGoogle = `      if (error) {
        toast({
          title: t('errors.auth'),
          description: error.message,
          variant: 'destructive',
        });
      }`;

const replaceGoogle = `      if (error) {
        if (error.message.startsWith('NETWORK_ERROR:')) {
          toast({
            title: t('errors.network'),
            description: 'Unable to connect to the authentication server. Please check your internet connection and try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: t('errors.auth'),
            description: error.message,
            variant: 'destructive',
          });
        }
      }`;

code = code.replace(targetGoogle, replaceGoogle);

fs.writeFileSync(file, code);
